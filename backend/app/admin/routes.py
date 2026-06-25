from datetime import date
from io import BytesIO
import mimetypes
import os
import re
from zipfile import BadZipFile, ZipFile
from flask import Blueprint, current_app, has_app_context, json, request
from PIL import UnidentifiedImageError
from werkzeug.datastructures import FileStorage
from app.decorators import cognito_auth_required, time_api_call
from app.media import (
    build_vehicle_response,
    create_vehicle_document_media,
    create_vehicle_image,
    create_vehicle_video_media,
    delete_s3_keys,
    delete_vehicle_documents,
    delete_vehicle_images_for_keys,
    replace_vehicle_main_thumbnails,
    S3UploadTransaction,
    safe_upload_filename,
    set_vehicle_image_order,
    validate_image_upload,
    vehicle_s3_keys,
)
from app.utils import success_response, error_response
from app.cognito import cognito_client, s3_client
from app.config import Config
from app.models import User, Vehicle
from app.extensions import db
from sqlalchemy.exc import IntegrityError
from vpic import Client


admin_bp = Blueprint('admin', __name__)

vpic = Client()

VIN_PATTERN = re.compile(r"^[A-HJ-NPR-Z0-9]{17}$")
VIN_VALIDATION_ERROR = (
    "VIN must contain exactly 17 letters or digits; I, O, and Q are not allowed"
)
VIN_DUPLICATE_ERROR = "There is already a vehicle with this VIN"
IMAGE_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".jfif",
    ".gif",
    ".webp",
    ".bmp",
    ".heic",
    ".heif",
    ".avif",
}
ZIP_EXTENSIONS = {".zip"}
IGNORED_ZIP_NAMES = {".ds_store", "thumbs.db"}
MAX_IMAGE_UPLOADS_PER_REQUEST = 300
MAX_ZIP_IMAGE_COUNT = 300
MAX_ZIP_UNCOMPRESSED_BYTES = 500 * 1024 * 1024
MAX_ZIP_ENTRY_BYTES = 50 * 1024 * 1024


class DuplicateVinError(ValueError):
    pass


class VehicleUploadError(ValueError):
    pass


def empty_to_none(value):
    if value is None:
        return None
    value = value.strip() if isinstance(value, str) else value
    return value or None


def normalize_vin(value):
    """Normalize and validate a VIN received from an untrusted client."""
    if not isinstance(value, str):
        raise ValueError(VIN_VALIDATION_ERROR)
    vin = value.strip().upper()
    if not VIN_PATTERN.fullmatch(vin):
        raise ValueError(VIN_VALIDATION_ERROR)
    return vin


def ensure_unique_vin(vin, vehicle_id=None):
    query = Vehicle.query.filter(Vehicle.vin == vin)
    if vehicle_id is not None:
        query = query.filter(Vehicle.id != vehicle_id)
    if query.first() is not None:
        raise DuplicateVinError(VIN_DUPLICATE_ERROR)


def is_duplicate_vin_error(error):
    return "uq_vehicles_vin" in str(getattr(error, "orig", error))


def values_match(left, right):
    if left is None or right is None:
        return left is None and right is None
    return left == right


def numeric_values_match(left, right):
    if left is None or right is None:
        return left is None and right is None
    return float(left) == float(right)


def vehicle_matches_create_payload(vehicle, payload):
    for field, expected in payload.items():
        actual = getattr(vehicle, field)
        if field in {"price_delivery", "price_shipping"}:
            if not numeric_values_match(actual, expected):
                return False
        elif not values_match(actual, expected):
            return False
    return True


def safe_filenames(files):
    return [safe_upload_filename(file.filename) for file in files]


def is_zip_upload(file):
    filename = getattr(file, "filename", "")
    ext = os.path.splitext(filename)[1].lower()
    mimetype = getattr(file, "mimetype", "")
    return ext in ZIP_EXTENSIONS or mimetype in {
        "application/zip",
        "application/x-zip-compressed",
    }


def is_supported_image_name(filename):
    return os.path.splitext(filename)[1].lower() in IMAGE_EXTENSIONS


def is_ignored_zip_entry(entry_name):
    normalized = entry_name.replace("\\", "/")
    parts = [part for part in normalized.split("/") if part]
    if not parts:
        return True
    basename = parts[-1].lower()
    return "__macosx" in {part.lower() for part in parts} or basename in IGNORED_ZIP_NAMES


def uploaded_file_bytes(file):
    stream = getattr(file, "stream", file)
    if hasattr(stream, "seek"):
        stream.seek(0)
    data = stream.read()
    if hasattr(stream, "seek"):
        stream.seek(0)
    return data


def image_filestorage(filename, data):
    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    return FileStorage(
        stream=BytesIO(data),
        filename=safe_upload_filename(filename),
        content_type=content_type,
    )


def log_upload_warning(message, *args):
    if has_app_context():
        current_app.logger.warning(message, *args)


def unique_safe_filename(filename, existing_names):
    safe_name = safe_upload_filename(filename)
    stem, ext = os.path.splitext(safe_name)
    candidate = safe_name
    index = 1
    while candidate.lower() in existing_names:
        candidate = f"{stem}({index}){ext}"
        index += 1
    existing_names.add(candidate.lower())
    return candidate


def validate_image_file(file, field_name):
    filename = safe_upload_filename(getattr(file, "filename", "image"))
    if getattr(file, "_vehicle_image_validated", False):
        return
    try:
        validate_image_upload(file)
    except ValueError as exc:
        log_upload_warning(
            "Invalid vehicle image upload field=%s filename=%s error=%s",
            field_name,
            filename,
            exc,
        )
        raise VehicleUploadError(f"{field_name}: {exc}") from exc


def validate_image_files(field_name, files):
    if len(files) > MAX_IMAGE_UPLOADS_PER_REQUEST:
        raise VehicleUploadError(
            f"{field_name}: too many image files "
            f"({len(files)} > {MAX_IMAGE_UPLOADS_PER_REQUEST})"
        )

    for file in files:
        validate_image_file(file, field_name)


def expand_zip_image_upload(file):
    filename = safe_upload_filename(getattr(file, "filename", "images.zip"))
    try:
        with ZipFile(BytesIO(uploaded_file_bytes(file))) as archive:
            images = []
            existing_names = set()
            total_uncompressed_bytes = 0
            for entry in archive.infolist():
                if entry.is_dir() or is_ignored_zip_entry(entry.filename):
                    continue
                entry_name = os.path.basename(entry.filename)
                if not entry_name or not is_supported_image_name(entry_name):
                    continue
                if entry.file_size > MAX_ZIP_ENTRY_BYTES:
                    raise VehicleUploadError(
                        f"Image ZIP entry is too large: {filename}/{entry_name}"
                    )
                total_uncompressed_bytes += entry.file_size
                if total_uncompressed_bytes > MAX_ZIP_UNCOMPRESSED_BYTES:
                    raise VehicleUploadError(
                        f"Image ZIP file is too large after extraction: {filename}"
                    )
                if len(images) >= MAX_ZIP_IMAGE_COUNT:
                    raise VehicleUploadError(
                        f"Image ZIP contains too many images: {filename}"
                    )

                entry_bytes = archive.read(entry)
                unique_name = unique_safe_filename(entry_name, existing_names)
                image_file = image_filestorage(unique_name, entry_bytes)
                try:
                    validate_image_upload(image_file)
                except ValueError as exc:
                    log_upload_warning(
                        "Invalid vehicle image ZIP entry zip=%s entry=%s error=%s",
                        filename,
                        entry.filename,
                        exc,
                    )
                    raise VehicleUploadError(
                        f"Invalid image inside ZIP: {filename}/{entry_name}"
                    ) from exc
                image_file._vehicle_image_validated = True
                images.append(image_file)
    except BadZipFile as exc:
        raise VehicleUploadError(f"Invalid image ZIP file: {filename}") from exc

    if not images:
        raise VehicleUploadError(f"Image ZIP file contains no supported images: {filename}")
    return images


def expand_image_uploads(files):
    expanded = []
    for file in files:
        if is_zip_upload(file):
            expanded.extend(expand_zip_image_upload(file))
        else:
            expanded.append(file)
    return expanded


def order_image_uploads(files, ordered_names):
    if not ordered_names:
        return files

    by_filename = {}
    for file in files:
        filename = safe_upload_filename(getattr(file, "filename", "image"))
        by_filename.setdefault(filename, []).append(file)

    ordered_files = []
    for name in ordered_names:
        filename = safe_upload_filename(name)
        candidates = by_filename.get(filename)
        if candidates:
            ordered_files.append(candidates.pop(0))

    return ordered_files


def normalize_thumbnail_upload(thumbnail, images):
    if thumbnail and is_zip_upload(thumbnail):
        return expand_zip_image_upload(thumbnail)[0]
    return thumbnail or (images[0] if images else None)


def validate_vehicle_image_uploads(images, thumbnail=None, image_field="images"):
    validate_image_files(image_field, images)
    if thumbnail:
        validate_image_file(thumbnail, "thumbnail")


def media_rows_by_type(vehicle, media_type):
    return [media for media in vehicle.media if media.media_type == media_type]


def vehicle_matches_create_media(vehicle, image_order, thumbnail, images, videos, documents):
    if list(vehicle.image_order or []) != image_order:
        return False

    thumbnail_rows = media_rows_by_type(vehicle, "thumbnail")
    thumbnail_source = thumbnail or (images[0] if images else None)
    if thumbnail_source:
        expected_name = safe_upload_filename(thumbnail_source.filename)
        if not thumbnail_rows:
            return False
        if any(row.original_filename != expected_name for row in thumbnail_rows):
            return False
    elif thumbnail_rows:
        return False

    existing_video_names = sorted(
        row.original_filename for row in media_rows_by_type(vehicle, "video")
    )
    if existing_video_names != sorted(safe_filenames(videos)):
        return False

    expected_documents = {
        document_type: safe_upload_filename(file.filename)
        for document_type, file in documents.items()
        if file
    }
    existing_documents = {
        row.document_type: row.original_filename
        for row in media_rows_by_type(vehicle, "document")
    }
    return existing_documents == expected_documents


def parse_optional_float(value):
    value = empty_to_none(value)
    return float(value) if value is not None else None


def parse_optional_date(value):
    value = empty_to_none(value)
    return date.fromisoformat(value) if value is not None else None


def normalize_shipping_status(value):
    return "Delivered" if value == "Delivered" else "Not delivered"


def cleanup_s3_keys(keys, description):
    """Best-effort S3 cleanup without masking the request's primary result."""
    if not keys:
        return
    for attempt in range(1, 4):
        try:
            delete_s3_keys(keys)
            return
        except Exception:
            if attempt == 3:
                current_app.logger.exception(
                    "Failed to clean up %s after %s attempts; keys=%s",
                    description,
                    attempt,
                    list(keys),
                )
            else:
                current_app.logger.warning(
                    "Retrying cleanup of %s after attempt %s",
                    description,
                    attempt,
                    exc_info=True,
                )


def get_cognito_user_statuses():
    statuses = {}
    paginator = cognito_client.get_paginator("list_users")
    for page in paginator.paginate(UserPoolId=Config.USER_POOL_ID):
        for user in page.get("Users", []):
            statuses[user["Username"]] = {
                "status": user.get("UserStatus"),
                "enabled": user.get("Enabled", False),
            }
    return statuses


@admin_bp.route("/users/create-user", methods=["POST"])
@cognito_auth_required(["Admin"])
def admin_create_user():
    try:

        # make user in cognito
        username = request.form.get("username")
        email = request.form.get("email")
        phone_number = request.form.get("phoneNumber")

        attrs = [
            {"Name": "email_verified", "Value": "True"},
        ]

        resp = cognito_client.admin_create_user(
            UserPoolId=Config.USER_POOL_ID,
            Username=email,
            UserAttributes=attrs,
            DesiredDeliveryMediums=["EMAIL"]
        )

        cognito_client.admin_add_user_to_group(
            UserPoolId=Config.USER_POOL_ID,
            Username=email,
            GroupName=Config.DEFAULT_USER_GROUP
        )

        # create their corresponding folder in AWS S3
        bucket = Config.S3_BUCKET
        folder_name = f"{resp['User']['Username']}/"

        s3_client.put_object(
            Bucket=bucket,
            Key=folder_name
        )

        # add user to db
        new_user = User(
            cognito_sub=resp["User"]["Username"],
            name=username,
            email=email,
            phone_number=phone_number
        )
        db.session.add(new_user)
        db.session.commit()

        return success_response()

    except Exception as e:
        print(str(e))
        return error_response(message=str(e), code=500)

@admin_bp.route("/users/<string:sub>/delete-user", methods=["POST"])
@cognito_auth_required(["Admin"])
def admin_delete_user(sub: str):
    try:
        user = User.query.get(sub)
        if user is None:
            return error_response("User not found", 404)

        try:
            cognito_client.admin_delete_user(
                UserPoolId=Config.USER_POOL_ID,
                Username=sub,
            )
        except cognito_client.exceptions.UserNotFoundException:
            pass

        prefix = f"{sub}/"
        continuation_token = None
        while True:
            list_kwargs = {
                "Bucket": Config.S3_BUCKET,
                "Prefix": prefix,
                "MaxKeys": 1000,
            }
            if continuation_token:
                list_kwargs["ContinuationToken"] = continuation_token

            resp = s3_client.list_objects_v2(**list_kwargs)
            objects = resp.get("Contents", [])

            if not objects:
                break

            delete_keys = [{"Key": obj["Key"]} for obj in objects]
            s3_client.delete_objects(
                Bucket=Config.S3_BUCKET,
                Delete={"Objects": delete_keys, "Quiet": True},
            )

            if resp.get("IsTruncated"):
                continuation_token = resp["NextContinuationToken"]
            else:
                break

        db.session.delete(user)
        db.session.commit()

        return success_response()

    except Exception as e:
        print(str(e))
        db.session.rollback()
        return error_response(message=str(e), code=500)

@admin_bp.route("/users/<string:sub>/resend-invite", methods=["POST"])
@cognito_auth_required(["Admin"])
def admin_resend_user_invite(sub: str):
    try:
        user = User.query.get(sub)
        if user is None:
            return error_response("User not found", 404)

        cognito_client.admin_create_user(
            UserPoolId=Config.USER_POOL_ID,
            Username=user.email,
            MessageAction="RESEND",
            DesiredDeliveryMediums=["EMAIL"],
        )

        return success_response()

    except Exception as e:
        print(str(e))
        return error_response(message=str(e), code=500)

@admin_bp.route("/users/get-all-users", methods=["GET"])
@cognito_auth_required(["Admin"])
def admin_get_all_users():
    try:
        users = User.query.order_by(User.name).all()
        cognito_statuses = get_cognito_user_statuses()

        users_list = [
            {
                "sub":   u.cognito_sub,
                "username":  u.name,
                "email": u.email,
                "phone_number": u.phone_number,
                "cognito_status": cognito_statuses.get(
                    u.cognito_sub, {}
                ).get("status"),
                "cognito_enabled": cognito_statuses.get(
                    u.cognito_sub, {}
                ).get("enabled", False),
            }
            for u in users
        ]

        return success_response({"users": users_list})

    except Exception as e:
        print(str(e))
        return error_response(message=str(e), code=500)

@admin_bp.route("/users/<string:sub>/get-user", methods=["GET"])
@cognito_auth_required(["Admin"])
def admin_get_specific_user(sub):
    try:
        user = User.query.filter_by(cognito_sub=sub).first()
        if not user:
            return error_response(message="User not found", code=404)

        user_data = {
            "sub":           user.cognito_sub,
            "username":      user.name,
            "email":         user.email,
            "phone_number":  user.phone_number,
        }

        return success_response({"user": user_data})

    except Exception as e:
        print(str(e))
        return error_response(message=str(e), code=500)

@admin_bp.route("/vehicles/edit/<int:vehicle_id>/<int:on_singular_vehicle_page>", methods=["PUT"])
@cognito_auth_required(["Admin"])
def admin_edit_vehicle_with_images(vehicle_id, on_singular_vehicle_page):
    s3_transaction = S3UploadTransaction()
    transaction_committed = False
    try:
        raw_payload = request.form.get("payload")
        if raw_payload is None:
            return error_response(message="Missing vehicle edit payload", code=400)

        payload = json.loads(raw_payload)
        if not isinstance(payload, dict):
            return error_response(message="Vehicle edit payload must be an object", code=400)

        delete_keys = request.form.getlist("delete_keys[]")

        new_image_order = request.form.getlist("image_order[]")
        new_files = order_image_uploads(
            expand_image_uploads(request.files.getlist("new_images")),
            new_image_order,
        )
        delete_document_types = set(request.form.getlist("delete_document_types[]"))

        new_thumbnail = request.files.get("new_thumbnail")
        if new_thumbnail and is_zip_upload(new_thumbnail):
            new_thumbnail = expand_zip_image_upload(new_thumbnail)[0]
        validate_vehicle_image_uploads(
            new_files,
            thumbnail=new_thumbnail,
            image_field="new_images",
        )
        bill_of_sale_document = request.files.get("billOfSaleDocument")
        title_document = request.files.get("titleDocument")
        bill_of_lading_document = request.files.get("billOfLadingDocument")
        swb_release_document = request.files.get("swbReleaseDocument")

        allowed = {
            "lot_number": empty_to_none,
            "auction_name": empty_to_none,
            "location": empty_to_none,
            "shipping_status": normalize_shipping_status,
            "price_shipping": parse_optional_float,
            "price_delivery": parse_optional_float,
            "container_number": empty_to_none,
            "port_of_origin": empty_to_none,
            "port_of_destination": empty_to_none,
            "destination": empty_to_none,
            "etd": parse_optional_date,
            "eta": parse_optional_date,
            "delivery_address": empty_to_none,
            "receiver_id": empty_to_none,
            "vin": normalize_vin,
            "model_year": empty_to_none,
            "make": empty_to_none,
            "powertrain": empty_to_none,
            "model": empty_to_none,
            "color": empty_to_none,
        }

        if "modelYear" in payload and "model_year" not in payload:
            payload["model_year"] = payload["modelYear"]

        vehicle = Vehicle.query.get_or_404(vehicle_id)
        updates = {}
        for field, cast in allowed.items():
            if field in payload:
                updates[field] = cast(payload[field])

        if "vin" in updates:
            ensure_unique_vin(updates["vin"], vehicle_id=vehicle.id)

        for field, value in updates.items():
            setattr(vehicle, field, value)

        delete_vehicle_images_for_keys(
            vehicle, delete_keys, s3_transaction=s3_transaction
        )
        db.session.flush()

        next_sort_order = len(vehicle.images)
        for index, image_file in enumerate(new_files):
            create_vehicle_image(
                vehicle, image_file, next_sort_order + index,
                s3_transaction=s3_transaction,
            )

        if new_image_order:
            db.session.flush()
            db.session.expire(vehicle, ["images"])
            set_vehicle_image_order(vehicle, new_image_order)
            vehicle.image_order = new_image_order

        if new_thumbnail:
            replace_vehicle_main_thumbnails(
                vehicle, new_thumbnail, s3_transaction=s3_transaction
            )

        if delete_document_types:
            delete_vehicle_documents(
                vehicle, delete_document_types, s3_transaction=s3_transaction
            )

        document_uploads = [
            (bill_of_sale_document, "bill_of_sale_document"),
            (title_document, "title_document"),
            (bill_of_lading_document, "bill_of_lading_document"),
            (swb_release_document, "swb_release_document"),
        ]
        for document_file, document_type in document_uploads:
            if document_file:
                create_vehicle_document_media(
                    vehicle, document_file, document_type,
                    s3_transaction=s3_transaction,
                )

        db.session.commit()
        transaction_committed = True
        cleanup_s3_keys(
            s3_transaction.superseded_keys,
            "superseded vehicle media objects",
        )

        vehicle = Vehicle.query.get_or_404(vehicle_id)
        v_dict = build_vehicle_response(
            vehicle,
            include_images=bool(on_singular_vehicle_page),
            include_videos=bool(on_singular_vehicle_page),
        )
        return success_response({"vehicle": v_dict})

    except DuplicateVinError as e:
        db.session.rollback()
        if not transaction_committed:
            cleanup_s3_keys(
                s3_transaction.uploaded_keys,
                "staged vehicle media objects after rollback",
            )
        return error_response(message=str(e), code=409)
    except (VehicleUploadError, UnidentifiedImageError) as e:
        current_app.logger.warning(
            "Invalid vehicle edit upload vehicle_id=%s error=%s",
            vehicle_id,
            e,
        )
        db.session.rollback()
        if not transaction_committed:
            cleanup_s3_keys(
                s3_transaction.uploaded_keys,
                "staged vehicle media objects after rollback",
            )
        return error_response(message=f"Invalid vehicle upload: {e}", code=400)
    except (TypeError, ValueError) as e:
        db.session.rollback()
        if not transaction_committed:
            cleanup_s3_keys(
                s3_transaction.uploaded_keys,
                "staged vehicle media objects after rollback",
            )
        return error_response(message=str(e), code=400)
    except IntegrityError as e:
        db.session.rollback()
        if not transaction_committed:
            cleanup_s3_keys(
                s3_transaction.uploaded_keys,
                "staged vehicle media objects after rollback",
            )
        if is_duplicate_vin_error(e):
            return error_response(message=VIN_DUPLICATE_ERROR, code=409)
        return error_response(message=str(e), code=500)
    except Exception as e:
        print(str(e))
        db.session.rollback()
        if not transaction_committed:
            cleanup_s3_keys(
                s3_transaction.uploaded_keys,
                "staged vehicle media objects after rollback",
            )
        return error_response(message=str(e), code=500)

@admin_bp.post("/vehicles/decode-vin/<string:vin>")
@cognito_auth_required(["Admin"])
def decode_vin(vin: str):
    try:
        vin = normalize_vin(vin)
    except (TypeError, ValueError) as e:
        return error_response(message=str(e), code=400)

    raw = vpic.decode_vin(vin, flatten=True)   # returns a dict
    fuel_primary   = raw.get("FuelTypePrimary", "").lower()
    fuel_secondary = raw.get("FuelTypeSecondary", "").lower()

    def classify(pt: str, st: str = "") -> str:
        txt = f"{pt} {st}"
        if "electric" in txt or "fuel cell" in txt:
            if "gas" in txt or "diesel" in txt or "hybrid" in txt:
                return "Hybrid"
            return "Electric"
        return "Gas"

    powertrain = classify(fuel_primary, fuel_secondary)
    payload = {
        # "vin":           raw["VIN"],
        "make":          raw["Make"],
        "model":         raw["Model"],
        "modelYear":     raw["ModelYear"],
        "powertrain":    powertrain,
    }
    return success_response(payload)


@admin_bp.route("/vehicles/<string:sub>/create-vehicle", methods=["POST"])
@cognito_auth_required(["Admin"])
@time_api_call("create_vehicle")
def admin_create_vehicle(sub):
    s3_transaction = S3UploadTransaction()
    transaction_committed = False
    try:

        lot_number = empty_to_none(request.form.get("lotNumber"))
        auction_name = empty_to_none(request.form.get("auctionName"))
        location = empty_to_none(request.form.get("location"))
        shipping_status = normalize_shipping_status(request.form.get("shippingStatus"))

        container_number = empty_to_none(request.form.get("containerNumber"))
        delivery_address = empty_to_none(request.form.get("deliveryAddress"))
        port_of_destination = empty_to_none(request.form.get("portOfDestination"))
        port_of_origin = empty_to_none(request.form.get("portOfOrigin"))
        destination = empty_to_none(request.form.get("destination"))
        etd = parse_optional_date(request.form.get("etd"))
        eta = parse_optional_date(request.form.get("eta"))
        receiver_id = empty_to_none(request.form.get("receiverId"))

        vin = normalize_vin(request.form.get("vin"))
        model_year = empty_to_none(request.form.get("modelYear") or request.form.get("model_year"))
        make = empty_to_none(request.form.get("make"))
        powertrain = empty_to_none(request.form.get("powertrain"))
        model = empty_to_none(request.form.get("model"))
        color = empty_to_none(request.form.get("color"))

        price_delivery = parse_optional_float(request.form.get("priceDelivery"))
        price_shipping = parse_optional_float(request.form.get("priceShipping"))

        user = User.query.filter_by(cognito_sub=sub).first()
        if user is None:
            return error_response(message="User not found", code=404)
        user_email = user.email

        vehicle_payload = {
            "cognito_sub": sub,
            "lot_number": lot_number,
            "auction_name": auction_name,
            "location": location,
            "shipping_status": shipping_status,
            "price_delivery": price_delivery,
            "price_shipping": price_shipping,
            "user_email": user_email,
            "container_number": container_number,
            "delivery_address": delivery_address,
            "port_of_destination": port_of_destination,
            "port_of_origin": port_of_origin,
            "destination": destination,
            "etd": etd,
            "eta": eta,
            "receiver_id": receiver_id,
            "vin": vin,
            "model_year": model_year,
            "make": make,
            "powertrain": powertrain,
            "model": model,
            "color": color,
        }

        requested_image_order = request.form.getlist("image_order[]")
        images = order_image_uploads(
            expand_image_uploads(request.files.getlist("images")),
            requested_image_order,
        )
        thumbnail = request.files.get("thumbnail")
        if thumbnail and is_zip_upload(thumbnail):
            thumbnail = expand_zip_image_upload(thumbnail)[0]
        validate_vehicle_image_uploads(images, thumbnail=thumbnail)
        videos = request.files.getlist("videos")

        bill_of_sale_document = request.files.get("billOfSaleDocument")
        title_document = request.files.get("titleDocument")
        bill_of_lading_document = request.files.get("billOfLadingDocument")
        swb_release_document = request.files.get("swbReleaseDocument")
        documents = {
            "bill_of_sale_document": bill_of_sale_document,
            "bill_of_lading_document": bill_of_lading_document,
            "title_document": title_document,
            "swb_release_document": swb_release_document,
        }

        image_order = [
            safe_upload_filename(image.filename)
            for image in images
        ]
        vehicle_payload["image_order"] = image_order

        existing_vehicle = Vehicle.query.filter_by(vin=vin).first()
        if existing_vehicle is not None:
            if (
                existing_vehicle.cognito_sub == sub
                and vehicle_matches_create_payload(existing_vehicle, vehicle_payload)
                and vehicle_matches_create_media(
                    existing_vehicle, image_order, thumbnail, images, videos, documents
                )
            ):
                return success_response()
            return error_response(message=VIN_DUPLICATE_ERROR, code=409)

        new_vehicle = Vehicle(
            **vehicle_payload,
        )

        db.session.add(new_vehicle)
        db.session.flush()

        for index, image in enumerate(images):
            create_vehicle_image(
                new_vehicle, image, index, s3_transaction=s3_transaction
            )

        thumbnail_source = normalize_thumbnail_upload(thumbnail, images)
        if thumbnail_source:
            replace_vehicle_main_thumbnails(
                new_vehicle,
                thumbnail_source,
                s3_transaction=s3_transaction,
            )

        for video in videos:
            create_vehicle_video_media(
                new_vehicle, video, s3_transaction=s3_transaction
            )

        if bill_of_sale_document:
            create_vehicle_document_media(
                new_vehicle, bill_of_sale_document, "bill_of_sale_document",
                replace=False, s3_transaction=s3_transaction,
            )
        if bill_of_lading_document:
            create_vehicle_document_media(
                new_vehicle, bill_of_lading_document, "bill_of_lading_document",
                replace=False, s3_transaction=s3_transaction,
            )
        if title_document:
            create_vehicle_document_media(
                new_vehicle, title_document, "title_document",
                replace=False, s3_transaction=s3_transaction,
            )
        if swb_release_document:
            create_vehicle_document_media(
                new_vehicle, swb_release_document, "swb_release_document",
                replace=False, s3_transaction=s3_transaction,
            )

        db.session.commit()
        transaction_committed = True
        cleanup_s3_keys(
            s3_transaction.superseded_keys,
            "superseded vehicle media objects",
        )

        return success_response()

    except DuplicateVinError as e:
        db.session.rollback()
        if not transaction_committed:
            cleanup_s3_keys(
                s3_transaction.uploaded_keys,
                "staged vehicle media objects after rollback",
            )
        return error_response(message=str(e), code=409)
    except (VehicleUploadError, UnidentifiedImageError) as e:
        current_app.logger.warning(
            "Invalid vehicle create upload sub=%s error=%s",
            sub,
            e,
        )
        db.session.rollback()
        if not transaction_committed:
            cleanup_s3_keys(
                s3_transaction.uploaded_keys,
                "staged vehicle media objects after rollback",
            )
        return error_response(message=f"Invalid vehicle upload: {e}", code=400)
    except (TypeError, ValueError) as e:
        db.session.rollback()
        if not transaction_committed:
            cleanup_s3_keys(
                s3_transaction.uploaded_keys,
                "staged vehicle media objects after rollback",
            )
        return error_response(message=str(e), code=400)
    except IntegrityError as e:
        db.session.rollback()
        if not transaction_committed:
            cleanup_s3_keys(
                s3_transaction.uploaded_keys,
                "staged vehicle media objects after rollback",
            )
        if is_duplicate_vin_error(e):
            return error_response(message=VIN_DUPLICATE_ERROR, code=409)
        return error_response(message=str(e), code=500)
    except Exception as e:
        print(str(e))
        db.session.rollback()
        if not transaction_committed:
            cleanup_s3_keys(
                s3_transaction.uploaded_keys,
                "staged vehicle media objects after rollback",
            )
        return error_response(message=str(e), code=500)


@admin_bp.route("/vehicles/<string:sub>/delete-vehicle/<int:vehicle_id>", methods=["POST"])
@cognito_auth_required(["Admin"])
def admin_delete_vehicle(sub, vehicle_id):
    try:
        vehicle = Vehicle.query.filter_by(id=vehicle_id).first()

        if vehicle is None:
            return success_response()

        if vehicle.cognito_sub != sub:
            return error_response(message="Vehicle not found", code=404)

        keys_to_delete = vehicle_s3_keys(vehicle)
        db.session.delete(vehicle)
        db.session.commit()
        cleanup_s3_keys(keys_to_delete, "deleted vehicle media objects")
    except Exception as e:
        db.session.rollback()
        return error_response(message="Failed to delete vehicle", code=500)

    return success_response()


@admin_bp.route("/dashboard", methods=["GET"])
@cognito_auth_required(["Admin"])
def admin_fetch_dashboard():
    try:
        # stats
        total_cars = Vehicle.query.count()
        total_users = User.query.count()
        vehicles_delivered = (
            Vehicle.query
            .filter(Vehicle.shipping_status == "Delivered")
            .count()
        )
        vehicles_not_delivered = total_cars - vehicles_delivered

        # activity feed last 5 creations across
        last_vehicles = (
            Vehicle.query
            .order_by(Vehicle.created_at.desc())
            .limit(5)
            .all()
        )
        last_users = (
            User.query
            .order_by(User.created_at.desc())
            .limit(5)
            .all()
        )

        events = []
        for v in last_vehicles:
            events.append({
                "type": "Vehicle",
                "action": "Vehicle Created",
                "vehicleName": v.vehicle_name,
                "lotNumber": v.lot_number,
                "timestamp": v.created_at.isoformat(),
                "userEmail": v.user_email,
                "cognitoSub": v.cognito_sub,
            })

        for u in last_users:
            events.append({
                "type": "User",
                "action": "User Created",
                "username": u.name,
                "timestamp": u.created_at.isoformat(),
                "cognitoSub": u.cognito_sub,
            })

        # sort
        activity_feed = sorted(
            events,
            key=lambda e: e["timestamp"],
            reverse=True
        )[:5]

        for k, event in enumerate(activity_feed):
            event["id"] = k

        recent_users_query = (
            User.query
            .order_by(User.created_at.desc())
            .limit(4)
            .all()
        )
        recent_users = [
            {
                "username": u.name,
                "email": u.email,
                "cognitoSub": u.cognito_sub,
                "createdAt": u.created_at.isoformat()
            }
            for u in recent_users_query
        ]

        # recent vehicles created (last 6)
        recent_vehicles_query = (
            Vehicle.query
            .order_by(Vehicle.created_at.desc())
            .limit(6)
            .all()
        )
        recent_vehicles = [
            {
                "id": v.id,
                "vehicleName": v.vehicle_name,
                "lotNumber": v.lot_number,
                "auctionName": v.auction_name,
                "shippingStatus": v.shipping_status,
                "createdAt": v.created_at.isoformat(),
                "userEmail": v.user_email,
                "cognitoSub": v.cognito_sub,
            }
            for v in recent_vehicles_query
        ]

        # vehicles not delivered (last 6)
        not_delivered_query = (
            Vehicle.query
            .filter(Vehicle.shipping_status != "Delivered")
            .order_by(Vehicle.created_at.desc())
            .limit(6)
            .all()
        )
        vehicles_not_delivered_list = [
            {
                "id": v.id,
                "vehicleName": v.vehicle_name,
                "lotNumber": v.lot_number,
                "auctionName": v.auction_name,
                "shippingStatus": v.shipping_status,
                "createdAt": v.created_at.isoformat(),
                "userEmail": v.user_email,
                "cognitoSub": v.cognito_sub,
            }
            for v in not_delivered_query
        ]

        return success_response({
            "stats": {
                "totalCars": total_cars,
                "totalUsers": total_users,
                "vehiclesDelivered": vehicles_delivered,
                "vehiclesNotDelivered": vehicles_not_delivered
            },
            "activityFeed": activity_feed,
            "recentUsers": recent_users,
            "recentVehicles": recent_vehicles,
            "vehiclesNotDelivered": vehicles_not_delivered_list
        })

    except Exception as e:
        return error_response(message=str(e), code=500)
