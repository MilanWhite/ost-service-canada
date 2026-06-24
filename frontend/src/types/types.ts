export type VehicleFilterField =
    | "default"
    | "created_at"
    | "etd"
    | "eta"
    | "vin"
    | "model_year"
    | "make"
    | "model"
    | "powertrain"
    | "destination";

export type VehicleStatusFilter = "both" | "Delivered" | "Not delivered";

export const VehicleFilterChoices = {
    default: "AuthenticatedView.default",
    created_at: "AuthenticatedView.date_created",
    etd: "ETD",
    eta: "ETA",
    vin: "AuthenticatedView.vin",
    model_year: "AuthenticatedView.year",
    make: "AuthenticatedView.make",
    model: "AuthenticatedView.model",
    powertrain: "AuthenticatedView.powertrain",
    destination: "AuthenticatedView.destination",
}

export const VehicleStatusFilterChoices = {
    both: "AuthenticatedView.both",
    Delivered: "AuthenticatedView.delivered",
    "Not delivered": "AuthenticatedView.not_delivered",
}

// export const VehicleFilterChoices = {
//     vehicle_name: "Vehicle Name",
//     lot_number: "Lot Number",
//     auction_name: "Auction Name",
//     location: "Location",
//     shipping_status: "Shipping Status",

//     port_of_origin: "Port of Origin",
//     port_of_destination: "Port of Destination",
//     delivery_address: "Delivery Address",
//     receiver_id: "Reciever Id",
// }

export const LanguageFilterChoices = {
    english: "English",
    russian: "Russian",
    ukrainian: "Ukrainian",

}

export interface DecodedVin {
    modelYear: string;
    make: string;

    powertrain: string;
    model: string;
    
    [key: string]: unknown;   // catch‑all for extra fields
}
