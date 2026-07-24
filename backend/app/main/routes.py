from flask import Blueprint, current_app, request, send_file
from sqlalchemy import String, case, cast, or_

from app.models import User, Vehicle
from app.media import (
    attach_vehicle_media,
    build_vehicle_images_zip,
    build_vehicle_response,
    VehicleImageArchiveError,
    vehicle_images_zip_filename,
    vehicle_media_rows_by_vehicle_id,
)
from app.utils import success_response, error_response, check_sub
from app.decorators import cognito_auth_required, time_api_call
from app.cognito import cognito_client
from app.config import Config
from app.extensions import db

main_bp = Blueprint('main', __name__)

# requires pagination
@main_bp.route("/<string:sub>/vehicles", methods=["GET"])
@time_api_call("vehicle_list")
@cognito_auth_required(["Admin", "RegularUser"])
def main_get_user_vehicles(sub):
    try:

        auth_error = check_sub(request.user["cognito:groups"], request.user["sub"], sub)
        if auth_error:
            return auth_error

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 10, type=int)

        vehicle_search = request.args.get("vehicle_search", "", type=str).strip()
        vehicle_filter_by = request.args.get("vehicle_filter_by", None, type=str)
        vehicle_status_filter = request.args.get("vehicle_status_filter", "both", type=str)

        vehicles = Vehicle.query.filter_by(cognito_sub=sub).order_by(
            case((Vehicle.shipping_status == "Not delivered", 0), else_=1),
            Vehicle.created_at.desc(),
        )

        if vehicle_status_filter in {"Delivered", "Not delivered"}:
            vehicles = vehicles.filter(Vehicle.shipping_status == vehicle_status_filter)

        # filter vehicles by search

        if vehicle_search:
            # whitelist to avoid injection
            allowed = {
              "created_at",
              "etd",
              "eta",
              "vin",
              "model_year",
              "make",
              "model",
              "powertrain",
              "destination",
            }

            if vehicle_filter_by in allowed:
                col = getattr(Vehicle, vehicle_filter_by)
                vehicles = vehicles.filter(cast(col, String).ilike(f"%{vehicle_search}%"))
            else:
                # Default search covers the visible vehicle-list fields.
                pattern = f"%{vehicle_search}%"
                vehicles = vehicles.filter(
                    or_(
                        cast(Vehicle.created_at, String).ilike(pattern),
                        cast(Vehicle.etd, String).ilike(pattern),
                        cast(Vehicle.eta, String).ilike(pattern),
                        Vehicle.vin.ilike(pattern),
                        Vehicle.model_year.ilike(pattern),
                        Vehicle.make.ilike(pattern),
                        Vehicle.model.ilike(pattern),
                        Vehicle.powertrain.ilike(pattern),
                        Vehicle.destination.ilike(pattern),
                    )
                )

        pagination = vehicles.paginate(page=page, per_page=per_page, error_out=False)
        vehicle_rows = pagination.items
        vehicles_list = [v.to_dict() for v in vehicle_rows]
        media_by_vehicle_id = vehicle_media_rows_by_vehicle_id(
            [vehicle.id for vehicle in vehicle_rows]
        )

        for vehicle in vehicles_list:
            attach_vehicle_media(
                vehicle,
                media_by_vehicle_id.get(vehicle["id"], []),
                include_videos=False,
            )

        return success_response({
            "vehicles": vehicles_list,
            "meta": {
                "page":        pagination.page,
                "per_page":    pagination.per_page,
                "total_pages": pagination.pages,
                "total_items": pagination.total,
                "has_next":    pagination.has_next,
                "has_prev":    pagination.has_prev,
            }
        })

    except Exception as e:
        print(f"[admin_get_user_vehicles] {e}")
        return error_response(message=str(e), code=500)

@main_bp.route("/<string:sub>/get-user", methods=["GET"])
@cognito_auth_required(["Admin", "RegularUser"])
def main_get_user(sub):
    try:

        auth_error = check_sub(request.user["cognito:groups"], request.user["sub"], sub)
        if auth_error:
            return auth_error

        user = User.query.filter_by(cognito_sub=sub).first()
        if not user:
            return error_response(message="User not found", code=404)

        # 2. serialize
        user_data = {
            "sub":           user.cognito_sub,
            "username":      user.name,
            "email":         user.email,
            "phone_number":  user.phone_number,
            "email_notifications_enabled": user.email_notifications_enabled,
            "notification_language": user.notification_language,
        }

        if "Admin" in request.user["cognito:groups"]:
            cognito_user = cognito_client.admin_get_user(
                UserPoolId=Config.USER_POOL_ID,
                Username=sub,
            )
            user_data["cognito_status"] = cognito_user.get("UserStatus")
            user_data["cognito_enabled"] = cognito_user.get("Enabled", False)

        # 3. return
        return success_response({"user": user_data})

    except Exception as e:
        print(str(e))
        return error_response(message=str(e), code=500)


@main_bp.route("/<string:sub>/vehicles/<string:vehicle_id>", methods=["GET"])
@cognito_auth_required(["Admin", "RegularUser"])
def main_get_specific_vehicle(sub,vehicle_id):
    try:

        auth_error = check_sub(request.user["cognito:groups"], request.user["sub"], sub)
        if auth_error:
            return auth_error

        vehicle = (
            Vehicle.query
            .filter_by(id=vehicle_id, cognito_sub=sub)
            .first()
        )
        if not vehicle:
            return error_response("Vehicle not found", 404)

        vehicle = build_vehicle_response(
            vehicle,
            include_images=True,
            include_videos=True,
        )

        return success_response({"vehicle": vehicle})

    except Exception as e:
        print(f"[main_get_user_vehicles] {e}")
        return error_response(message=str(e), code=500)


@main_bp.route("/<string:sub>/notification-preferences", methods=["PUT"])
@cognito_auth_required(["RegularUser"])
def main_update_notification_preferences(sub):
    try:
        auth_error = check_sub(request.user["cognito:groups"], request.user["sub"], sub)
        if auth_error:
            return auth_error

        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return error_response(message="Request body must be an object", code=400)

        user = User.query.filter_by(cognito_sub=sub).first()
        if user is None:
            return error_response(message="User not found", code=404)

        if "email_notifications_enabled" in payload:
            enabled = payload["email_notifications_enabled"]
            if not isinstance(enabled, bool):
                return error_response(
                    message="email_notifications_enabled must be a boolean", code=400
                )
            user.email_notifications_enabled = enabled

        if "notification_language" in payload:
            language = payload["notification_language"]
            if language not in {"en", "ru", "uk"}:
                return error_response(message="Unsupported notification language", code=400)
            user.notification_language = language

        db.session.commit()
        return success_response({
            "email_notifications_enabled": user.email_notifications_enabled,
            "notification_language": user.notification_language,
        })
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("Failed to update notification preferences")
        return error_response(message=str(e), code=500)


@main_bp.route("/<string:sub>/vehicles/<string:vehicle_id>/images.zip", methods=["GET"])
@time_api_call("vehicle_images_zip")
@cognito_auth_required(["Admin", "RegularUser"])
def main_download_vehicle_images_zip(sub, vehicle_id):
    try:
        auth_error = check_sub(request.user["cognito:groups"], request.user["sub"], sub)
        if auth_error:
            return auth_error

        vehicle = (
            Vehicle.query
            .filter_by(id=vehicle_id, cognito_sub=sub)
            .first()
        )
        if not vehicle:
            return error_response("Vehicle not found", 404)

        archive = build_vehicle_images_zip(vehicle)
        return send_file(
            archive,
            mimetype="application/zip",
            as_attachment=True,
            download_name=vehicle_images_zip_filename(vehicle),
            max_age=0,
        )
    except VehicleImageArchiveError as e:
        status_code = 404 if "No images" in str(e) else 502
        details = {"filename": e.filename} if e.filename else None
        return error_response(str(e), status_code, details=details)
    except Exception as e:
        print(f"[vehicle_images_zip] {e}")
        return error_response("Could not prepare the vehicle images download.", 500)

# user dashboard
@main_bp.route("/dashboard", methods=["GET"])
@cognito_auth_required(["RegularUser"])
def user_fetch_dashboard():
    try:
        user_sub = request.user.get("sub")

        # total cars of user
        total_cars = (
            Vehicle.query
            .filter_by(cognito_sub=user_sub)
            .count()
        )

        # number of users vehicles delivered
        vehicles_delivered = (
            Vehicle.query
            .filter_by(cognito_sub=user_sub, shipping_status="Delivered")
            .count()
        )

        # number of user vehicles not delivered
        vehicles_not_delivered = (
            Vehicle.query
            .filter(
                Vehicle.cognito_sub == user_sub,
                Vehicle.shipping_status != "Delivered"
            )
            .count()
        )

        # recently created vehicles for this user
        recent_vehicles_query = (
            Vehicle.query
            .filter_by(cognito_sub=user_sub)
            .order_by(Vehicle.created_at.desc())
            .limit(6)
            .all()
        )
        recently_created = [
            {
                "id": v.id,
                "vehicleName": v.vehicle_name,
                "lotNumber": v.lot_number,
                "auctionName": v.auction_name,
                "shippingStatus": v.shipping_status,
                "createdAt": v.created_at.isoformat(),
            }
            for v in recent_vehicles_query
        ]

        # vehicles not delivered for this user
        not_delivered_query = (
            Vehicle.query
            .filter(
                Vehicle.cognito_sub == user_sub,
                Vehicle.shipping_status != "Delivered"
            )
            .order_by(Vehicle.created_at.desc())
            .limit(6)
            .all()
        )
        not_delivered = [
            {
                "id": v.id,
                "vehicleName": v.vehicle_name,
                "lotNumber": v.lot_number,
                "auctionName": v.auction_name,
                "shippingStatus": v.shipping_status,
                "createdAt": v.created_at.isoformat(),
            }
            for v in not_delivered_query
        ]

        return success_response({
            "stats": {
                "totalCars": total_cars,
                "vehiclesDelivered": vehicles_delivered,
                "vehiclesNotDelivered": vehicles_not_delivered
            },
            "recentlyCreated": recently_created,
            "notDelivered": not_delivered
        })

    except Exception as e:
        return error_response(message=str(e), code=500)
