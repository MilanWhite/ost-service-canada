from datetime import datetime, timezone

from sqlalchemy import ARRAY, TEXT, CheckConstraint, Computed, UniqueConstraint
from app.extensions import db

class User(db.Model):
    __tablename__ = "users"
    __table_args__ = (
        db.Index("ix_users_created_at", "created_at"),
    )

    cognito_sub  = db.Column(db.String(255), primary_key=True)

    name         = db.Column(db.String(255), nullable=False)
    email        = db.Column(db.String(255), nullable=False, unique=True)
    phone_number = db.Column(db.String(20))
    created_at   = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    vehicles = db.relationship(
        "Vehicle",
        back_populates="owner",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def to_dict(self):
        return {
            "cognito_sub": self.cognito_sub,
            "name":        self.name,
            "email":       self.email,
            "phone_number": self.phone_number,
            "created_at":   self.created_at.isoformat(),
        }


class Vehicle(db.Model):
    __tablename__ = "vehicles"
    __table_args__ = (
        db.Index(
            "ix_vehicles_cognito_sub_created_at",
            "cognito_sub",
            "created_at",
        ),
        db.Index(
            "ix_vehicles_cognito_sub_shipping_status_created_at",
            "cognito_sub",
            "shipping_status",
            "created_at",
        ),
        db.Index("ix_vehicles_created_at", "created_at"),
        UniqueConstraint("vin", name="uq_vehicles_vin"),
        CheckConstraint(
            "shipping_status IN ('Delivered', 'Not delivered')",
            name="ck_vehicles_shipping_status",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)

    vehicle_name = db.Column(
        db.String(350),
        Computed(
            "trim(coalesce(model_year, '') || ' ' || coalesce(make, '') || ' ' || coalesce(model, '') || ' ' || vin)",
            persisted=True,
        ),
    )
    lot_number          = db.Column(db.String(50))
    auction_name        = db.Column(db.String(100))
    location            = db.Column(db.String(100))
    shipping_status     = db.Column(
        db.String(20),
        nullable=False,
        default="Not delivered",
        server_default="Not delivered",
    )
    price_delivery      = db.Column(db.Numeric(10, 2))
    price_shipping      = db.Column(db.Numeric(10, 2))

    vin         = db.Column(db.CHAR(17), nullable=False)
    model_year  = db.Column(db.String(10))
    make        = db.Column(db.String(100))
    powertrain  = db.Column(db.String(50))
    model       = db.Column(db.String(100))
    color       = db.Column(db.String(30))

    cognito_sub = db.Column(
        db.String(255),
        db.ForeignKey("users.cognito_sub", ondelete="CASCADE"),
        nullable=False,
    )

    user_email          = db.Column(db.String(100), nullable=False)
    created_at          = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    container_number    = db.Column(db.String(20))
    port_of_origin      = db.Column(db.String(100))
    port_of_destination = db.Column(db.String(100))
    destination         = db.Column(db.String(100))
    etd                 = db.Column(db.Date)
    eta                 = db.Column(db.Date)
    delivery_address    = db.Column(db.Text)
    receiver_id         = db.Column(db.String(255))

    image_order = db.Column(
        ARRAY(TEXT),
        nullable=False,
        default=list,
    )

    owner = db.relationship("User", back_populates="vehicles")
    images = db.relationship(
        "VehicleImage",
        back_populates="vehicle",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="VehicleImage.sort_order",
    )
    media = db.relationship(
        "VehicleMedia",
        back_populates="vehicle",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def to_dict(self):
        return {
            "id":                   self.id,
            "vehicle_name":         self.vehicle_name,
            "lot_number":           self.lot_number,
            "auction_name":         self.auction_name,
            "location":             self.location,
            "shipping_status":      self.shipping_status,
            "price_delivery":       float(self.price_delivery) if self.price_delivery is not None else None,
            "price_shipping":       float(self.price_shipping) if self.price_shipping is not None else None,
            "vin":                  self.vin,
            "model_year":           self.model_year,
            "make":                 self.make,
            "powertrain":           self.powertrain,
            "model":                self.model,
            "color":                self.color,
            "cognito_sub":          self.cognito_sub,
            "user_email":           self.user_email,
            "created_at":           self.created_at.isoformat(),
            "container_number":     self.container_number,
            "port_of_origin":       self.port_of_origin,
            "port_of_destination":  self.port_of_destination,
            "destination":          self.destination,
            "etd":                  self.etd.isoformat() if self.etd else None,
            "eta":                  self.eta.isoformat() if self.eta else None,
            "delivery_address":     self.delivery_address,
            "receiver_id":          self.receiver_id,
            "image_order":          self.image_order,
        }


class VehicleImage(db.Model):
    __tablename__ = "vehicle_images"

    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(
        db.Integer,
        db.ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    original_filename = db.Column(db.String(255), nullable=False)
    sort_order = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    vehicle = db.relationship("Vehicle", back_populates="images")
    variants = db.relationship(
        "VehicleImageVariant",
        back_populates="image",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class VehicleImageVariant(db.Model):
    __tablename__ = "vehicle_image_variants"
    __table_args__ = (
        UniqueConstraint(
            "vehicle_image_id",
            "variant",
            name="uq_vehicle_image_variants_image_variant",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    vehicle_image_id = db.Column(
        db.Integer,
        db.ForeignKey("vehicle_images.id", ondelete="CASCADE"),
        nullable=False,
    )
    variant = db.Column(db.String(20), nullable=False)
    s3_key = db.Column(db.Text, nullable=False, unique=True)
    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    content_type = db.Column(db.String(100))
    size_bytes = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    image = db.relationship("VehicleImage", back_populates="variants")


class VehicleMedia(db.Model):
    __tablename__ = "vehicle_media"

    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(
        db.Integer,
        db.ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    media_type = db.Column(db.String(20), nullable=False)
    s3_key = db.Column(db.Text, nullable=False, unique=True)
    original_filename = db.Column(db.String(255))
    document_type = db.Column(db.String(80))
    variant = db.Column(db.String(20))
    content_type = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    vehicle = db.relationship("Vehicle", back_populates="media")
