import { useTranslation } from "react-i18next";
import { CheckCircleIcon, ClockIcon } from "@heroicons/react/20/solid";
import { translateStatus, Vehicle } from "../../hooks/interfaces";

import ImageCarousel from "../ImageCarousel";
import VehicleThumbnail from "../VehicleThumbnail";
import DownloadImagesButton from "../DownloadImagesButton";

interface Props {
    vehicle: Vehicle;
}

const UserVehiclePage = ({ vehicle }: Props) => {
    const { t, i18n } = useTranslation();

    const vehicleDetails = [
        { label: t("AuthenticatedView.vin"), value: vehicle.vin },
        { label: t("AuthenticatedView.year"), value: vehicle.model_year },
        { label: t("AuthenticatedView.make"), value: vehicle.make },
        { label: t("AuthenticatedView.model"), value: vehicle.model },
        { label: t("AuthenticatedView.powertrain"), value: vehicle.powertrain },
        {
            label: t("AuthenticatedView.shipping_status"),
            value: t(translateStatus(vehicle.shipping_status) as string),
        },
        { label: t("AuthenticatedView.destination"), value: vehicle.destination },
        { label: "ETD", value: vehicle.etd },
        { label: "ETA", value: vehicle.eta },
    ];

    const normalizeAsset = (src?: string) => src?.split("?")[0] ?? "";
    const getNameFromUrl = (src?: string) => {
        if (!src) return "";

        try {
            const parsed = new URL(src);
            return decodeURIComponent(parsed.pathname.split("/").pop() ?? "");
        } catch {
            return decodeURIComponent(src.split("?")[0].split("/").pop() ?? "");
        }
    };
    const thumbnailSources = new Set([
        normalizeAsset(vehicle.vehicleThumbnail),
        normalizeAsset(vehicle.vehicleThumbnailMobile),
    ]);
    const thumbnailName = vehicle.vehicleThumbnailName?.toLowerCase() ?? "";
    const imageFallback = vehicle.vehicleImages?.[0] ?? "";
    const bannerDesktopThumbnail =
        vehicle.vehicleThumbnail || imageFallback || vehicle.vehicleThumbnailMobile || "";
    const bannerMobileThumbnail =
        vehicle.vehicleThumbnailMobile || imageFallback || vehicle.vehicleThumbnail || "";
    const photoImageItems = vehicle.vehicleImageItems ?? [];
    const nonThumbnailImages = (vehicle.vehicleImages ?? []).filter(
        (image) =>
            !thumbnailSources.has(normalizeAsset(image)) &&
            (!thumbnailName ||
                getNameFromUrl(image).toLowerCase() !== thumbnailName)
    );
    const thumbnailImages = (vehicle.vehicleImages ?? []).filter(
        (image) => !nonThumbnailImages.includes(image)
    );
    const photoImages =
        photoImageItems.length > 0
            ? photoImageItems.map((item) => item.original)
            : nonThumbnailImages.length > 0
            ? [...nonThumbnailImages, ...thumbnailImages]
            : vehicle.vehicleImages ?? [];

    const dateCreated = new Intl.DateTimeFormat(i18n.language, {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(vehicle.created_at));

    const statusBadgeClass =
        vehicle.shipping_status === "Delivered"
            ? "border-status-delivered-border bg-status-delivered-bg text-status-delivered-text"
            : "border-status-not-delivered-border bg-status-not-delivered-bg text-status-not-delivered-text";
    const StatusIcon =
        vehicle.shipping_status === "Delivered" ? CheckCircleIcon : ClockIcon;

    const renderFieldGrid = (
        fields: { label: string; value: string | number | null }[]
    ) => (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
            {fields.map((field) => (
                <div key={field.label}>
                    <dt className="text-sm font-medium text-gray-600">
                        {field.label}
                    </dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-gray-900">
                        {field.value ?? ""}
                    </dd>
                </div>
            ))}
        </dl>
    );

    return (
        <div className="w-full max-w-full overflow-x-hidden bg-white pb-8 sm:overflow-visible">
            <div className="mx-auto w-full max-w-full py-3 sm:max-w-none">
                <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
                    <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[9rem_1fr] lg:items-center">
                        <VehicleThumbnail
                            mobileSrc={bannerMobileThumbnail}
                            desktopSrc={bannerDesktopThumbnail}
                            alt={vehicle.vehicle_name}
                            fallbackSrc={imageFallback}
                            hideMobileFallback
                            className="aspect-[4/3] w-full rounded-lg object-cover sm:aspect-square lg:size-36"
                        />

                        <div className="min-w-0">
                            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                                {vehicle.vehicle_name}
                            </h1>
                            <div className="mt-3 flex flex-col items-start gap-2">
                                <p className="text-sm font-medium text-gray-600">
                                    {t("AuthenticatedView.date_created")}:{" "}
                                    <time dateTime={vehicle.created_at}>
                                        {dateCreated}
                                    </time>
                                </p>
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold shadow-xs ${statusBadgeClass}`}
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
                    </div>
                </section>

                <div className="mt-5 grid min-w-0 max-w-full gap-5 lg:grid-cols-3">
                    <div className="min-w-0 space-y-5 lg:col-span-2">
                        <section className="w-full min-w-0 max-w-full rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {t("AuthenticatedView.vehicle_info")}
                            </h2>
                            <div className="mt-4 border-t border-gray-200 pt-4">
                                {renderFieldGrid(vehicleDetails)}
                            </div>
                        </section>

                        <section className="w-full min-w-0 max-w-full rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {t("AuthenticatedView.documents")}
                            </h2>
                            <div className="mt-4 grid gap-3 border-t border-gray-200 pt-4 sm:grid-cols-2">
                                {[
                                    {
                                        label: t("AuthenticatedView.bill_of_sale"),
                                        href: vehicle.vehicleBillOfSaleDocument,
                                        viewLabel: t(
                                            "AuthenticatedView.view_bill_of_sale"
                                        ),
                                    },
                                    {
                                        label: t("AuthenticatedView.title_document"),
                                        href: vehicle.vehicleTitleDocument,
                                        viewLabel: t(
                                            "AuthenticatedView.view_title_document"
                                        ),
                                    },
                                    {
                                        label: t("AuthenticatedView.bill_of_lading"),
                                        href: vehicle.vehicleBillOfLadingDocument,
                                        viewLabel: t(
                                            "AuthenticatedView.view_bill_of_lading"
                                        ),
                                    },
                                    {
                                        label: t(
                                            "AuthenticatedView.swb_release_document"
                                        ),
                                        href: vehicle.vehicleSWBReleaseDocument,
                                        viewLabel: t(
                                            "AuthenticatedView.view_swb_release_document"
                                        ),
                                    },
                                ].map((document) => (
                                    <div key={document.label}>
                                        <p className="text-sm font-medium text-gray-600">
                                            {document.label}
                                        </p>
                                        {document.href ? (
                                            <a
                                                href={document.href}
                                                target="_blank"
                                                rel="noopener"
                                                className="mt-1 inline-flex text-sm font-semibold text-primary hover:text-primary-hover"
                                            >
                                                {document.viewLabel}
                                            </a>
                                        ) : (
                                            <span className="mt-1 inline-flex text-sm font-semibold text-red-600">
                                                {t("AuthenticatedView.none")}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <aside className="min-w-0 lg:col-span-1">
                        <section className="w-full min-w-0 max-w-full rounded-lg border border-gray-200 bg-white p-4 shadow-xs lg:sticky lg:top-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {t("AuthenticatedView.photos")}
                                </h2>
                                <DownloadImagesButton
                                    images={photoImages}
                                    vehicleName={vehicle.vehicle_name}
                                />
                            </div>
                            <div className="mt-4 border-t border-gray-200 pt-4">
                                <ImageCarousel
                                    images={photoImages}
                                    imageItems={photoImageItems}
                                    videos={vehicle.vehicleVideos ?? []}
                                />
                            </div>
                        </section>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default UserVehiclePage;
