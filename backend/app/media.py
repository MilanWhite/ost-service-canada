import os
from collections import defaultdict
from dataclasses import dataclass
from io import BytesIO
from urllib.parse import unquote, urlparse
from uuid import uuid4

from PIL import Image, UnidentifiedImageError
from werkzeug.utils import secure_filename

from app.cognito import s3_client
from app.config import Config
from app.extensions import db
from app.models import VehicleImage, VehicleImageVariant, VehicleMedia

IMAGE_VARIANT_SIZES = {
    "thumbnail": (300, 300),
}

DOCUMENT_FIELDS = {
    "bill_of_sale_document": "vehicleBillOfSaleDocument",
    "title_document": "vehicleTitleDocument",
    "bill_of_lading_document": "vehicleBillOfLadingDocument",
    "swb_release_document": "vehicleSWBReleaseDocument",
}


def image_validation_error(filename):
    return ValueError(f"Invalid image file: {safe_upload_filename(filename)}")


@dataclass(frozen=True)
class ThumbnailReplacement:
    """S3 keys involved in a staged thumbnail replacement."""

    old_keys: tuple[str, ...]
    new_keys: tuple[str, ...]


@dataclass
class S3UploadTransaction:
    """S3 objects staged alongside a database transaction."""

    uploaded_keys: list[str]
    superseded_keys: list[str]

    def __init__(self):
        self.uploaded_keys = []
        self.superseded_keys = []

    def uploaded(self, key):
        if key:
            self.uploaded_keys.append(key)

    def superseded(self, keys):
        self.superseded_keys.extend(key for key in keys if key)

def safe_upload_filename(filename):
    basename = os.path.basename((filename or "").replace("\\", "/"))
    safe_name = secure_filename(basename)
    return safe_name or "file"


def presign_key(s3_key):
    if not s3_key:
        return ""

    return s3_client.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": Config.S3_BUCKET, "Key": s3_key},
        ExpiresIn=3600,
    )


def upload_fileobj(filename, s3_key, fileobj, content_type=None):
    upload_bytes(
        filename,
        s3_key,
        file_bytes(fileobj),
        content_type=content_type
        or getattr(fileobj, "mimetype", None)
        or "application/octet-stream",
    )


def upload_bytes(filename, s3_key, data, content_type=None):
    original_name = safe_upload_filename(filename)
    upload_buffer = BytesIO(data)
    upload_buffer.seek(0)

    s3_client.upload_fileobj(
        Fileobj=upload_buffer,
        Bucket=Config.S3_BUCKET,
        Key=s3_key,
        ExtraArgs={
            "ContentType": content_type or "application/octet-stream",
            "ContentDisposition": f'inline; filename="{original_name}"',
        },
    )


def file_bytes(fileobj):
    stream = getattr(fileobj, "stream", fileobj)
    if hasattr(stream, "seek"):
        stream.seek(0)
    data = stream.read()
    if hasattr(stream, "seek"):
        stream.seek(0)
    return data


def delete_s3_keys(s3_keys):
    keys = sorted({key for key in s3_keys if key})
    if not keys:
        return

    for start in range(0, len(keys), 1000):
        batch = keys[start:start + 1000]
        response = s3_client.delete_objects(
            Bucket=Config.S3_BUCKET,
            Delete={
                "Objects": [{"Key": key} for key in batch],
                "Quiet": True,
            },
        )
        errors = response.get("Errors", [])
        if errors:
            failed = ", ".join(error.get("Key", "") for error in errors)
            raise RuntimeError(f"Failed to delete S3 objects: {failed}")


def s3_key_from_url_or_key(url_or_key, vehicle):
    value = unquote(url_or_key or "")
    if value.startswith("http"):
        key = unquote(urlparse(value).path.lstrip("/"))
        bucket_prefix = f"{Config.S3_BUCKET}/"
        if Config.S3_BUCKET and key.startswith(bucket_prefix):
            key = key[len(bucket_prefix):]
        return key

    if "/" in value:
        return value.lstrip("/")

    return f"{vehicle.cognito_sub}/{vehicle.id}/{safe_upload_filename(value)}"


def _image_format_extension(fileobj):
    filename = safe_upload_filename(getattr(fileobj, "filename", "image"))
    _, ext = os.path.splitext(filename)
    return ext.lower() or ".jpg"


def _open_image(source):
    stream = BytesIO(source) if isinstance(source, bytes) else getattr(source, "stream", source)
    if hasattr(stream, "seek"):
        stream.seek(0)
    image = Image.open(stream)
    image.load()
    if hasattr(stream, "seek"):
        stream.seek(0)
    return image


def _webp_variant_buffer(fileobj, max_size):
    image = _open_image(fileobj)
    image.thumbnail(max_size)

    if image.mode not in {"RGB", "RGBA"}:
        image = image.convert("RGB")

    buffer = BytesIO()
    image.save(buffer, format="WEBP", quality=82)
    size_bytes = buffer.tell()
    buffer.seek(0)
    return buffer, image.size[0], image.size[1], size_bytes


def _source_image_dimensions(fileobj):
    image = _open_image(fileobj)
    return image.size[0], image.size[1]


def validate_image_upload(fileobj):
    """Decode an uploaded image without mutating durable state."""
    filename = getattr(fileobj, "filename", "image")
    try:
        image = _open_image(fileobj)
    except (UnidentifiedImageError, OSError) as exc:
        raise image_validation_error(filename) from exc
    return image.size[0], image.size[1]


def create_vehicle_image(vehicle, fileobj, sort_order, s3_transaction=None):
    uploaded_keys = []
    original_filename = safe_upload_filename(fileobj.filename)
    source_bytes = file_bytes(fileobj)
    vehicle_image = VehicleImage(
        vehicle=vehicle,
        original_filename=original_filename,
        sort_order=sort_order,
    )
    db.session.add(vehicle_image)
    db.session.flush()

    ext = _image_format_extension(fileobj)
    original_key = (
        f"{vehicle.cognito_sub}/{vehicle.id}/images/"
        f"{vehicle_image.id}/original{ext}"
    )
    try:
        original_width, original_height = _source_image_dimensions(source_bytes)
    except (UnidentifiedImageError, OSError) as exc:
        raise image_validation_error(original_filename) from exc

    try:
        upload_bytes(
            fileobj.filename,
            original_key,
            source_bytes,
            content_type=getattr(fileobj, "mimetype", None),
        )
        uploaded_keys.append(original_key)
        if s3_transaction:
            s3_transaction.uploaded(original_key)
        db.session.add(
            VehicleImageVariant(
                vehicle_image_id=vehicle_image.id,
                variant="original",
                s3_key=original_key,
                width=original_width,
                height=original_height,
                content_type=getattr(fileobj, "mimetype", None),
            )
        )

        for variant, max_size in IMAGE_VARIANT_SIZES.items():
            buffer, width, height, size_bytes = _webp_variant_buffer(source_bytes, max_size)
            key = (
                f"{vehicle.cognito_sub}/{vehicle.id}/images/"
                f"{vehicle_image.id}/{variant}.webp"
            )
            upload_fileobj(
                f"{os.path.splitext(original_filename)[0]}_{variant}.webp",
                key,
                buffer,
                content_type="image/webp",
            )
            uploaded_keys.append(key)
            if s3_transaction:
                s3_transaction.uploaded(key)
            db.session.add(
                VehicleImageVariant(
                    vehicle_image_id=vehicle_image.id,
                    variant=variant,
                    s3_key=key,
                    width=width,
                    height=height,
                    content_type="image/webp",
                    size_bytes=size_bytes,
                )
            )
    except Exception:
        delete_s3_keys(uploaded_keys)
        raise

    return vehicle_image


def set_vehicle_image_order(vehicle, ordered_filenames):
    ordered = [safe_upload_filename(name) for name in ordered_filenames]
    by_filename = defaultdict(list)

    for image in vehicle.images:
        by_filename[image.original_filename].append(image)

    seen_ids = set()
    next_order = 0
    for filename in ordered:
        candidates = by_filename.get(filename, [])
        image = next((candidate for candidate in candidates if candidate.id not in seen_ids), None)
        if image is None:
            continue
        image.sort_order = next_order
        seen_ids.add(image.id)
        next_order += 1

    for image in sorted(vehicle.images, key=lambda item: (item.sort_order, item.id)):
        if image.id not in seen_ids:
            image.sort_order = next_order
            next_order += 1


def find_vehicle_image_for_key(vehicle, s3_key):
    for image in vehicle.images:
        if any(variant.s3_key == s3_key for variant in image.variants):
            return image
    return None


def delete_vehicle_image(vehicle_image, s3_transaction=None):
    keys = [variant.s3_key for variant in vehicle_image.variants]
    if s3_transaction:
        s3_transaction.superseded(keys)
    else:
        delete_s3_keys(keys)
    db.session.delete(vehicle_image)


def delete_vehicle_images_for_keys(vehicle, url_or_keys, s3_transaction=None):
    deleted_filenames = []
    for url_or_key in url_or_keys:
        s3_key = s3_key_from_url_or_key(url_or_key, vehicle)
        vehicle_image = find_vehicle_image_for_key(vehicle, s3_key)
        if vehicle_image is None:
            continue
        deleted_filenames.append(vehicle_image.original_filename)
        delete_vehicle_image(vehicle_image, s3_transaction=s3_transaction)
    return deleted_filenames


def create_vehicle_video_media(vehicle, fileobj, s3_transaction=None):
    original_filename = safe_upload_filename(fileobj.filename)
    key = f"{vehicle.cognito_sub}/{vehicle.id}/videos/{uuid4().hex}/{original_filename}"
    upload_fileobj(fileobj.filename, key, fileobj)
    if s3_transaction:
        s3_transaction.uploaded(key)
    media = VehicleMedia(
        vehicle_id=vehicle.id,
        media_type="video",
        s3_key=key,
        original_filename=original_filename,
        content_type=getattr(fileobj, "mimetype", None),
    )
    db.session.add(media)
    return media


def replace_vehicle_main_thumbnails(vehicle, fileobj, s3_transaction=None):
    """Stage new thumbnails and swap DB rows without deleting working S3 data.

    The caller must delete ``new_keys`` if its database transaction rolls back,
    or delete ``old_keys`` only after the transaction commits successfully.
    """
    old_rows = [
        media for media in vehicle.media
        if media.media_type == "thumbnail"
    ]
    old_keys = tuple(media.s3_key for media in old_rows if media.s3_key)

    replacement_id = uuid4().hex
    base = f"{vehicle.cognito_sub}/{vehicle.id}/thumbnail/{replacement_id}"
    desktop_key = f"{base}/thumbnail.webp"
    mobile_key = f"{base}/thumbnail_mobile.webp"
    original_filename = safe_upload_filename(fileobj.filename)

    # Render both variants before touching S3. A corrupt image therefore cannot
    # leave even a partial replacement upload behind.
    source_bytes = file_bytes(fileobj)
    try:
        desktop_buffer, _width, _height, _size = _webp_variant_buffer(
            source_bytes,
            (350, 350),
        )
        mobile_buffer, _width, _height, _size = _webp_variant_buffer(
            source_bytes,
            (1080, 1080),
        )
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError(f"Invalid thumbnail image file: {original_filename}") from exc

    uploaded_keys = []
    try:
        upload_fileobj(
            f"{original_filename}_desktop.webp",
            desktop_key,
            desktop_buffer,
            content_type="image/webp",
        )
        uploaded_keys.append(desktop_key)
        if s3_transaction:
            s3_transaction.uploaded(desktop_key)
        upload_fileobj(
            f"{original_filename}_mobile.webp",
            mobile_key,
            mobile_buffer,
            content_type="image/webp",
        )
        uploaded_keys.append(mobile_key)
        if s3_transaction:
            s3_transaction.uploaded(mobile_key)
    except Exception:
        delete_s3_keys(uploaded_keys)
        raise

    try:
        for media in old_rows:
            db.session.delete(media)

        db.session.add_all([
            VehicleMedia(
                vehicle_id=vehicle.id,
                media_type="thumbnail",
                s3_key=desktop_key,
                original_filename=original_filename,
                variant="desktop",
                content_type="image/webp",
            ),
            VehicleMedia(
                vehicle_id=vehicle.id,
                media_type="thumbnail",
                s3_key=mobile_key,
                original_filename=original_filename,
                variant="mobile",
                content_type="image/webp",
            ),
        ])
        db.session.flush()
    except Exception:
        delete_s3_keys(uploaded_keys)
        raise

    if s3_transaction:
        s3_transaction.superseded(old_keys)

    return ThumbnailReplacement(
        old_keys=old_keys,
        new_keys=tuple(uploaded_keys),
    )


def create_vehicle_document_media(
    vehicle, fileobj, document_type, replace=True, s3_transaction=None
):
    if replace:
        delete_vehicle_documents(
            vehicle, {document_type}, s3_transaction=s3_transaction
        )
        db.session.flush()

    document_name = safe_upload_filename(vehicle.vehicle_name or vehicle.vin)
    key = (
        f"{vehicle.cognito_sub}/{vehicle.id}/documents/{uuid4().hex}/"
        f"{document_name}_{document_type}"
    )
    upload_fileobj(fileobj.filename, key, fileobj)
    if s3_transaction:
        s3_transaction.uploaded(key)
    media = VehicleMedia(
        vehicle_id=vehicle.id,
        media_type="document",
        s3_key=key,
        original_filename=safe_upload_filename(fileobj.filename),
        document_type=document_type,
        content_type=getattr(fileobj, "mimetype", None),
    )
    db.session.add(media)
    return media


def delete_vehicle_documents(vehicle, document_types, s3_transaction=None):
    rows = [
        media for media in vehicle.media
        if media.media_type == "document" and media.document_type in document_types
    ]
    keys = [media.s3_key for media in rows]
    if s3_transaction:
        s3_transaction.superseded(keys)
    else:
        delete_s3_keys(keys)
    for media in rows:
        db.session.delete(media)


def vehicle_media_rows_by_vehicle_id(vehicle_ids):
    if not vehicle_ids:
        return {}

    rows = (
        VehicleMedia.query
        .filter(VehicleMedia.vehicle_id.in_(vehicle_ids))
        .all()
    )
    grouped = defaultdict(list)
    for row in rows:
        grouped[row.vehicle_id].append(row)
    return grouped


def serialize_image_items(vehicle):
    image_items = []
    original_urls = []

    for image in sorted(vehicle.images, key=lambda item: (item.sort_order, item.id)):
        variants = {variant.variant: variant for variant in image.variants}
        original_url = presign_key(variants.get("original").s3_key) if variants.get("original") else ""
        mobile_url = presign_key(variants.get("mobile").s3_key) if variants.get("mobile") else ""
        thumbnail_url = presign_key(variants.get("thumbnail").s3_key) if variants.get("thumbnail") else ""

        if original_url:
            original_urls.append(original_url)

        image_items.append({
            "id": image.id,
            "filename": image.original_filename,
            "original": original_url,
            "mobile": mobile_url,
            "thumbnail": thumbnail_url,
        })

    return original_urls, image_items


def serialize_media_rows(media_rows, include_videos=True):
    payload = {
        "vehicleThumbnail": None,
        "vehicleThumbnailMobile": None,
        "vehicleThumbnailName": None,
        "vehicleVideos": [],
        "vehicleBillOfSaleDocument": "",
        "vehicleTitleDocument": "",
        "vehicleBillOfLadingDocument": "",
        "vehicleSWBReleaseDocument": "",
    }

    for row in media_rows:
        if row.media_type == "thumbnail":
            if row.variant == "mobile":
                payload["vehicleThumbnailMobile"] = presign_key(row.s3_key)
            else:
                payload["vehicleThumbnail"] = presign_key(row.s3_key)
                payload["vehicleThumbnailName"] = row.original_filename
        elif row.media_type == "video" and include_videos:
            payload["vehicleVideos"].append(presign_key(row.s3_key))
        elif row.media_type == "document":
            field = DOCUMENT_FIELDS.get(row.document_type)
            if field:
                payload[field] = presign_key(row.s3_key)

    if payload["vehicleThumbnailName"] is None:
        thumbnail_row = next(
            (row for row in media_rows if row.media_type == "thumbnail"),
            None,
        )
        if thumbnail_row:
            payload["vehicleThumbnailName"] = thumbnail_row.original_filename

    return payload


def attach_vehicle_media(vehicle_dict, media_rows, include_videos=False):
    payload = serialize_media_rows(media_rows, include_videos=include_videos)
    if not include_videos:
        payload.pop("vehicleVideos", None)
    vehicle_dict.update(payload)
    return vehicle_dict


def build_vehicle_response(vehicle, include_images=False, include_videos=True):
    vehicle_dict = vehicle.to_dict()
    attach_vehicle_media(
        vehicle_dict,
        vehicle.media,
        include_videos=include_videos,
    )

    if include_images:
        vehicle_dict["vehicleImages"], vehicle_dict["vehicleImageItems"] = serialize_image_items(vehicle)
    else:
        vehicle_dict["vehicleImages"] = []
        vehicle_dict["vehicleImageItems"] = []

    return vehicle_dict


def vehicle_s3_keys(vehicle):
    keys = []
    for image in vehicle.images:
        keys.extend(variant.s3_key for variant in image.variants)
    keys.extend(media.s3_key for media in vehicle.media)
    return keys
