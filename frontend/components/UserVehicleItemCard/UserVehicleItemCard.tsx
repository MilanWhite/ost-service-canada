import { Link } from "react-router-dom";
import { translateStatus, Vehicle } from "../../hooks/interfaces";
import { URLS } from "../../src/config/navigation";
import { useTranslation } from "react-i18next";
import { CheckCircleIcon, ClockIcon } from "@heroicons/react/20/solid";

import VehicleThumbnail from "../VehicleThumbnail";

interface Props {
    vehicle: Vehicle;
}

const UserVehicleItemCard = ({ vehicle }: Props) => {
    const { t, i18n } = useTranslation();

    const vehicleDetails = [
        { label: t("AuthenticatedView.vin"), value: vehicle.vin },
        { label: t("AuthenticatedView.year"), value: vehicle.model_year },
        { label: t("AuthenticatedView.make"), value: vehicle.make },
        { label: t("AuthenticatedView.model"), value: vehicle.model },
    ];

    const logisticsDetails = [
        {
            label: t("AuthenticatedView.container_number"),
            value: vehicle.container_number,
        },
        { label: t("AuthenticatedView.destination"), value: vehicle.destination },
        { label: "ETD", value: vehicle.etd },
        { label: "ETA", value: vehicle.eta },
    ];

    const documents = [
        {
            label: t("AuthenticatedView.bill_of_sale"),
            href: vehicle.vehicleBillOfSaleDocument,
        },
        {
            label: t("AuthenticatedView.bill_of_lading"),
            href: vehicle.vehicleBillOfLadingDocument,
        },
        {
            label: t("AuthenticatedView.copy_of_title"),
            href: vehicle.vehicleTitleDocument,
        },
        {
            label: t("AuthenticatedView.sea_waybill_release"),
            href: vehicle.vehicleSWBReleaseDocument,
        },
    ];

    const statusBadgeClass =
        vehicle.shipping_status === "Delivered"
            ? "border-status-delivered-border bg-status-delivered-bg text-status-delivered-text"
            : "border-status-not-delivered-border bg-status-not-delivered-bg text-status-not-delivered-text";
    const cardStatusClass =
        vehicle.shipping_status === "Delivered"
            ? "bg-status-delivered-card"
            : "bg-status-not-delivered-card";
    const StatusIcon =
        vehicle.shipping_status === "Delivered" ? CheckCircleIcon : ClockIcon;
    const dateCreated = new Intl.DateTimeFormat(i18n.language, {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(vehicle.created_at));
    const titleWithoutVin = vehicle.vehicle_name
        .replace(new RegExp(`\\s*${vehicle.vin}\\s*$`), "")
        .trim();

    return (
        <section aria-labelledby="vehicle-heading" className="mt-6">
            <h2 id="vehicle-heading" className="sr-only">
                {t("AuthenticatedView.vehicle_info")}
            </h2>

            <div
                key={vehicle.id}
                className={`overflow-hidden rounded-lg border border-gray-200 shadow-xs sm:relative ${cardStatusClass}`}
            >
                <div className="hidden px-4 pt-4 text-sm text-gray-500 sm:absolute sm:top-4 sm:right-6 sm:block sm:px-0 sm:pt-0 sm:text-right">
                    <p className="font-medium text-gray-900">
                        {t("AuthenticatedView.date_created")}
                    </p>
                    <time dateTime={vehicle.created_at}>{dateCreated}</time>
                </div>
                <div className="px-4 pt-4 pb-5 sm:px-5 sm:pt-5 lg:grid lg:grid-cols-12 lg:gap-x-4 lg:p-5">
                    {/* LEFT: image + basic info */}
                    <div className="sm:flex lg:col-span-4">
                        <VehicleThumbnail
                            mobileSrc={vehicle.vehicleThumbnailMobile ?? ""}
                            desktopSrc={vehicle.vehicleThumbnail ?? ""}
                            alt={vehicle.vehicle_name}
                            className="aspect-square w-full shrink-0 rounded-lg object-cover sm:size-32"
                            hideMobileFallback
                        />

                        <div className="mt-3 sm:mt-0 sm:ml-5 flex-1">
                            <h3 className="text-base font-medium text-gray-900">
                                <span className="lg:hidden">
                                    {vehicle.vehicle_name}
                                </span>
                                <span className="hidden lg:block">
                                    {titleWithoutVin || vehicle.vehicle_name}
                                    <span className="block text-gray-600">
                                        {vehicle.vin}
                                    </span>
                                </span>
                            </h3>
                            <p className="mt-1 text-sm text-gray-600 sm:hidden">
                                <span className="font-medium text-gray-900">
                                    {t("AuthenticatedView.date_created")}:
                                </span>{" "}
                                <time dateTime={vehicle.created_at}>
                                    {dateCreated}
                                </time>
                            </p>
                            <span
                                className={`mt-3 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold shadow-xs ${statusBadgeClass}`}
                            >
                                <StatusIcon className="size-5" />
                                {t(
                                    translateStatus(
                                        vehicle.shipping_status
                                    ) as string
                                )}
                            </span>
                        </div>
                    </div>

                    {/* RIGHT: details + actions */}
                    <div className="mt-5 lg:col-span-8 lg:mt-0 lg:pr-28 xl:pr-36">
                        <dl className="grid grid-cols-1 gap-x-6 text-sm">
                            <div className="space-y-4 lg:grid lg:grid-cols-3 lg:items-start lg:gap-x-10 lg:space-y-0 xl:gap-x-12">
                                <div className="min-w-0">
                                    <dt className="font-medium leading-snug text-gray-900">
                                        {t("AuthenticatedView.vehicle_info")}
                                    </dt>
                                    <dd className="mt-3 space-y-1 text-gray-500">
                                        {vehicleDetails.map((field) => (
                                            <span
                                                key={field.label}
                                                className="block"
                                            >
                                                <span className="font-medium text-gray-700">
                                                    {field.label}:{" "}
                                                </span>
                                                {field.value ?? ""}
                                            </span>
                                        ))}
                                    </dd>
                                </div>
                                <div className="block min-w-0 lg:hidden xl:block">
                                    <dt className="font-medium leading-snug text-gray-900">
                                        {t(
                                            "AuthenticatedView.logistics_shipping_details"
                                        )}
                                    </dt>
                                    <dd className="mt-3 space-y-1 text-gray-500 ">
                                        {logisticsDetails.map((field) => (
                                            <span
                                                key={field.label}
                                                className="block"
                                            >
                                                <span className="font-medium text-gray-700">
                                                    {field.label}:{" "}
                                                </span>
                                                {field.value ?? ""}
                                            </span>
                                        ))}
                                    </dd>
                                </div>
                                <div className="min-w-0">
                                    <dt className="font-medium leading-snug text-gray-900">
                                        {t("AuthenticatedView.documents")}
                                    </dt>
                                    <dd className="mt-3 space-y-1 text-gray-500">
                                        {documents.map((document) => (
                                            <span
                                                key={document.label}
                                                className="block"
                                            >
                                                {document.href ? (
                                                    <a
                                                        href={document.href}
                                                        target="_blank"
                                                        rel="noopener"
                                                        className="font-medium text-primary hover:text-primary-hover"
                                                    >
                                                        {document.label}
                                                    </a>
                                                ) : (
                                                    <>
                                                        <span className="font-medium text-gray-700">
                                                            {document.label}:{" "}
                                                        </span>
                                                        <span className="font-medium text-red-600">
                                                            {t("AuthenticatedView.none")}
                                                        </span>
                                                    </>
                                                )}
                                            </span>
                                        ))}
                                    </dd>
                                </div>
                            </div>
                        </dl>
                    </div>
                </div>
                <div className="px-4 pb-4 sm:absolute sm:right-5 sm:bottom-5 sm:px-0 sm:pb-0">
                    <div className="mt-2 flex justify-end sm:mt-0">
                        <Link
                            to={URLS.regularUserViewUserSingularVehicle(
                                vehicle.id.toString()
                            )}
                        >
                            <button
                                type="button"
                                onClick={() => {}}
                                className="cursor-pointer inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary-hover sm:ml-3 sm:w-auto"
                            >
                                {t("AuthenticatedView.view")}
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default UserVehicleItemCard;
