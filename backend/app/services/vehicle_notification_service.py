from datetime import datetime, timezone
from email.message import EmailMessage
from html import escape
from io import BytesIO
from pathlib import Path
import re
from urllib.parse import urljoin

from flask import current_app
from PIL import Image

from app.cognito import s3_client, ses_client
from app.config import Config


MAX_INLINE_IMAGES = 6
LOGO_PATH = Path(__file__).resolve().parent.parent / "assets" / "ost-service-logo.png"
LOGO_CONTENT_ID = "ost-service-logo"
EMAIL_FONT_STACK = (
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
)

COPY = {
    "en": {
        "subject_delivery": "Your vehicle has been delivered: {vehicle}",
        "subject_bill_of_lading": "Bill of lading updated: {vehicle}",
        "subject_delivery_and_bill_of_lading": "Vehicle delivery and document update: {vehicle}",
        "greeting": "Hello {name},",
        "delivery_intro": "The following vehicle has been delivered.",
        "bill_of_lading_intro": "The bill of lading for the following vehicle has been updated.",
        "delivery_and_bill_of_lading_intro": "The following vehicle has been delivered and its bill of lading has been updated.",
        "vehicle": "Vehicle",
        "keys": "Keys",
        "keys_yes": "Yes, the vehicle has keys",
        "keys_no": "No, the vehicle does not have keys",
        "photos": "Vehicle photos",
        "view": "View vehicle details and all photos",
    },
    "ru": {
        "subject_delivery": "Ваш автомобиль доставлен: {vehicle}",
        "subject_bill_of_lading": "Коносамент обновлён: {vehicle}",
        "subject_delivery_and_bill_of_lading": "Доставка автомобиля и обновление документа: {vehicle}",
        "greeting": "Здравствуйте, {name}!",
        "delivery_intro": "Указанный ниже автомобиль доставлен.",
        "bill_of_lading_intro": "Коносамент указанного ниже автомобиля был обновлён.",
        "delivery_and_bill_of_lading_intro": "Указанный ниже автомобиль доставлен, и его коносамент обновлён.",
        "vehicle": "Автомобиль",
        "keys": "Ключи",
        "keys_yes": "Да, у автомобиля есть ключи",
        "keys_no": "Нет, у автомобиля нет ключей",
        "photos": "Фотографии автомобиля",
        "view": "Посмотреть автомобиль и все фотографии",
    },
    "uk": {
        "subject_delivery": "Ваш автомобіль доставлено: {vehicle}",
        "subject_bill_of_lading": "Коносамент оновлено: {vehicle}",
        "subject_delivery_and_bill_of_lading": "Доставка автомобіля та оновлення документа: {vehicle}",
        "greeting": "Вітаємо, {name}!",
        "delivery_intro": "Автомобіль, зазначений нижче, доставлено.",
        "bill_of_lading_intro": "Коносамент автомобіля, зазначеного нижче, оновлено.",
        "delivery_and_bill_of_lading_intro": "Автомобіль, зазначений нижче, доставлено, і його коносамент оновлено.",
        "vehicle": "Автомобіль",
        "keys": "Ключі",
        "keys_yes": "Так, автомобіль має ключі",
        "keys_no": "Ні, автомобіль не має ключів",
        "photos": "Фотографії автомобіля",
        "view": "Переглянути автомобіль і всі фотографії",
    },
}


def _vehicle_url(vehicle):
    base = (Config.PUBLIC_FRONTEND_URL or "").rstrip("/") + "/"
    return urljoin(base, f"vehicles/{vehicle.id}")


def _inline_images(vehicle):
    images = []
    ordered = sorted(vehicle.images, key=lambda item: (item.sort_order, item.id))
    for image in ordered[:MAX_INLINE_IMAGES]:
        variants = {variant.variant: variant for variant in image.variants}
        variant = variants.get("thumbnail") or variants.get("mobile")
        if not variant:
            continue
        try:
            response = s3_client.get_object(Bucket=Config.S3_BUCKET, Key=variant.s3_key)
            source = response["Body"].read()
            decoded = Image.open(BytesIO(source))
            if decoded.mode != "RGB":
                decoded = decoded.convert("RGB")
            output = BytesIO()
            decoded.save(output, format="JPEG", quality=82, optimize=True)
            images.append((f"vehicle-image-{len(images) + 1}", output.getvalue()))
        except Exception as exc:
            current_app.logger.warning(
                "Skipping notification thumbnail vehicle_id=%s image_id=%s error_type=%s",
                vehicle.id,
                image.id,
                type(exc).__name__,
            )
    return images


def _vehicle_title(vehicle):
    title = (vehicle.vehicle_name or "").strip()
    vin = (vehicle.vin or "").strip()
    if title and vin:
        title = re.sub(
            rf"[\s\-–—|]*{re.escape(vin)}\s*$",
            "",
            title,
            flags=re.IGNORECASE,
        ).strip()
    return title or vin


def send_vehicle_notification(attempt):
    if not Config.SES_FROM_EMAIL:
        raise RuntimeError("SES_FROM_EMAIL is not configured")
    if not Config.PUBLIC_FRONTEND_URL:
        raise RuntimeError("PUBLIC_FRONTEND_URL is not configured")

    vehicle = attempt.vehicle
    owner = vehicle.owner
    language = attempt.language if attempt.language in COPY else "en"
    copy = COPY[language]
    title = _vehicle_title(vehicle)
    introduction = copy[f"{attempt.event_type}_intro"]
    includes_delivery = attempt.event_type in {
        "delivery",
        "delivery_and_bill_of_lading",
    }
    keys_text = copy["keys_yes"] if vehicle.has_keys else copy["keys_no"]
    vehicle_url = _vehicle_url(vehicle)
    inline_images = _inline_images(vehicle)

    message = EmailMessage()
    message["From"] = f"OST Service <{Config.SES_FROM_EMAIL}>"
    message["To"] = attempt.recipient_email
    message["Subject"] = copy[f"subject_{attempt.event_type}"].format(vehicle=title)

    plain = [copy["greeting"].format(name=owner.name), ""]
    plain.extend([introduction, ""])
    plain.extend([f"{copy['vehicle']}: {title}", f"VIN: {vehicle.vin}"])
    if includes_delivery:
        plain.append(f"{copy['keys']}: {keys_text}")
    plain.extend([
        "",
        f"{copy['view']}: {vehicle_url}",
    ])
    message.set_content("\n".join(plain))

    image_html = "".join(
        f'<img src="cid:{cid}" alt="{escape(title)}" '
        'style="width:180px;max-width:100%;height:auto;margin:4px;border-radius:6px">'
        for cid, _ in inline_images
    )
    intro_html = (
        f'<p style="font-size:16px;line-height:1.6;margin:0 0 14px">'
        f"{escape(introduction)}</p>"
    )
    keys_html = (
        f'<tr><td style="padding:10px 12px;color:#6b7280">{escape(copy["keys"])}</td>'
        f'<td style="padding:10px 12px;font-weight:600">{escape(keys_text)}</td></tr>'
        if includes_delivery
        else ""
    )
    photos_html = (
        f'<h2 style="font-family:{EMAIL_FONT_STACK};font-size:16px;line-height:24px;'
        f'margin:24px 0 10px;font-weight:600">{escape(copy["photos"])}</h2>'
        f'<div style="margin:0 -4px">{image_html}</div>'
        if inline_images
        else ""
    )
    message.add_alternative(
        f"""<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:{EMAIL_FONT_STACK};color:#111827">
        <div style="max-width:640px;margin:0 auto;padding:28px 16px">
          <div style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
            <div style="background:#f3f8fc;border-bottom:1px solid #cce0ef;padding:12px 20px;text-align:center">
              <img src="cid:{LOGO_CONTENT_ID}" alt="OST Service" width="120" style="display:inline-block;width:120px;max-width:50%;height:auto;margin:0 auto">
            </div>
            <div style="padding:28px;font-family:{EMAIL_FONT_STACK};font-size:14px;line-height:22px">
            <p style="font-size:16px;line-height:1.6;margin:0 0 18px">{escape(copy['greeting'].format(name=owner.name))}</p>
            {intro_html}
            <table role="presentation" style="width:100%;margin:20px 0;border-collapse:collapse;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-family:{EMAIL_FONT_STACK};font-size:14px;line-height:20px">
              <tr><td style="padding:10px 12px;color:#6b7280">{escape(copy['vehicle'])}</td><td style="padding:10px 12px;font-weight:600">{escape(title)}</td></tr>
              <tr><td style="padding:10px 12px;color:#6b7280">VIN</td><td style="padding:10px 12px;font-weight:600">{escape(vehicle.vin)}</td></tr>
              {keys_html}
            </table>
            {photos_html}
            <p style="margin:26px 0">
              <a href="{escape(vehicle_url)}" style="display:inline-block;background:#0066B1;color:#ffffff;text-decoration:none;font-family:{EMAIL_FONT_STACK};font-size:14px;line-height:20px;font-weight:600;padding:12px 18px;border-radius:7px">{escape(copy['view'])}</a>
            </p>
            </div>
          </div>
        </div>
        </body></html>""",
        subtype="html",
    )
    html_part = message.get_payload()[1]
    html_part.add_related(
        LOGO_PATH.read_bytes(),
        maintype="image",
        subtype="png",
        cid=f"<{LOGO_CONTENT_ID}>",
        filename=LOGO_PATH.name,
        disposition="inline",
    )
    for cid, image_bytes in inline_images:
        html_part.add_related(
            image_bytes,
            maintype="image",
            subtype="jpeg",
            cid=f"<{cid}>",
            filename=f"{cid}.jpg",
            disposition="inline",
        )

    response = ses_client.send_raw_email(
        Source=Config.SES_FROM_EMAIL,
        Destinations=[attempt.recipient_email],
        RawMessage={"Data": message.as_bytes()},
    )
    return response.get("MessageId")


def mark_attempt_completed(attempt, *, status, provider_message_id=None, error_summary=None):
    attempt.status = status
    attempt.provider_message_id = provider_message_id
    attempt.error_summary = error_summary
    attempt.completed_at = datetime.now(timezone.utc)
