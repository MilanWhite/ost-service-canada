import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CanceledError } from "axios";
import {
    CheckCircleIcon,
    ClockIcon,
    XMarkIcon,
} from "@heroicons/react/20/solid";

import ImageCarousel from "../ImageCarousel";
import ZipImagePreviewer from "../ZipImagePreviewer";
import AdminDeleteVehicleDialog from "../AdminDeleteVehicleDialog";
import ErrorBanner from "../ErrorBanner";
import VehicleThumbnail from "../VehicleThumbnail";
import DownloadImagesButton from "../DownloadImagesButton";

import { useEditVehicle } from "../../hooks/useEditVehicle";
import { translateStatus, Vehicle } from "../../hooks/interfaces";
import {
    DOCUMENT_FILE_ACCEPT,
    isDocumentFile,
} from "../../src/config/fileTypes";

interface Props {
    vehicle: Vehicle;
}

type EditableVehicleField =
    | "vin"
    | "model_year"
    | "make"
    | "model"
    | "powertrain"
    | "shipping_status"
    | "destination"
    | "etd"
    | "eta";

interface FieldConfig {
    label: string;
    value?: string | number | null;
    field?: EditableVehicleField;
    type?: string;
}

const AdminVehiclePage = ({ vehicle: initial }: Props) => {
    const { t, i18n } = useTranslation();

    const {
        vehicle,
        isEditing,
        isEditVehicleLoading,
        editVehicleError,
        startEditing,
        cancelEditing,
        handleChange,
        saveChanges,
    } = useEditVehicle(initial, true);

    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [uploadImageFiles, setUploadImageFiles] = useState<File[]>([]);
    const [thumbnail, setThumbnail] = useState<File | null>(null);
    const [documentFiles, setDocumentFiles] = useState({
        billOfSaleDocument: null as File | null,
        titleDocument: null as File | null,
        billOfLadingDocument: null as File | null,
        swbReleaseDocument: null as File | null,
    });
    const [deleteDocumentTypes, setDeleteDocumentTypes] = useState<string[]>(
        []
    );
    const normName = (u: string) =>
        decodeURIComponent(u.split("/").pop()!.split("?")[0]);
    const existingImageItems = useMemo(
        () =>
            vehicle.vehicleImageItems && vehicle.vehicleImageItems.length > 0
                ? vehicle.vehicleImageItems.map((item) => ({
                      original: item.original,
                      filename: item.filename,
                  }))
                : (initial.vehicleImages ?? []).map((url) => ({
                      original: url,
                      filename: normName(url),
                  })),
        [initial.vehicleImages, vehicle.vehicleImageItems]
    );

    useEffect(() => {
        let cancelled = false;

        (async () => {
            if (existingImageItems.length === 0) {
                if (!cancelled) {
                    setImageFiles([]);
                    setUploadImageFiles([]);
                }
                return;
            }

            const filePromises = existingImageItems.map(async (item) => {
                try {
                    const res = await fetch(item.original);
                    if (!res.ok) return null;
                    const blob = await res.blob();
                    return new File([blob], item.filename, { type: blob.type });
                } catch {
                    return null;
                }
            });

            const files = (await Promise.all(filePromises)).filter(
                (f): f is File => f !== null
            );

            if (!cancelled) {
                setImageFiles(files);
                setUploadImageFiles([]);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [existingImageItems]);

    const { toAdd, toDelete } = useMemo(() => {
        const originalNames = new Set(
            existingImageItems.map((item) => item.filename)
        );

        const add = imageFiles.filter(
            (f) => !originalNames.has(normName(f.name))
        );

        const del = existingImageItems
            .filter(
                (item) =>
                    !imageFiles.some(
                        (file) => item.filename === normName(file.name)
                    )
            )
            .map((item) => item.original);

        return { toAdd: add, toDelete: del };
    }, [existingImageItems, imageFiles]);

    const [saveError, setSaveError] = useState<string | null>(null);
    const [documentFileError, setDocumentFileError] = useState<string | null>(
        null
    );

    const handleSave = async () => {
        setSaveError(null);

        try {
            await saveChanges({
                newImages:
                    uploadImageFiles.length > 0 ? uploadImageFiles : toAdd,
                deleteKeys: toDelete,
                newThumbnail: thumbnail,
                imageOrder: imageFiles.map((imageFile) => imageFile.name),
                deleteDocumentTypes,
                ...documentFiles,
            });

            window.location.reload();
        } catch (err) {
            if (err instanceof CanceledError) return;

            setSaveError(
                err instanceof Error
                    ? err.message
                    : "AuthenticatedView.Errors.failed_to_edit_vehicle"
            );
        }
    };

    const [isDeleteVehicleDialogOpen, setDeleteVehicleDialogOpen] =
        useState(false);

    const vehicleDetails: FieldConfig[] = [
        { label: t("AuthenticatedView.vin"), field: "vin" },
        { label: t("AuthenticatedView.year"), field: "model_year" },
        { label: t("AuthenticatedView.make"), field: "make" },
        { label: t("AuthenticatedView.model"), field: "model" },
        { label: t("AuthenticatedView.powertrain"), field: "powertrain" },
        {
            label: t("AuthenticatedView.shipping_status"),
            field: "shipping_status",
        },
        { label: t("AuthenticatedView.destination"), field: "destination" },
        { label: "ETD", field: "etd", type: "date" },
        { label: "ETA", field: "eta", type: "date" },
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
        vehicle.vehicleThumbnail ||
        imageFallback ||
        vehicle.vehicleThumbnailMobile ||
        "";
    const bannerMobileThumbnail =
        vehicle.vehicleThumbnailMobile ||
        imageFallback ||
        vehicle.vehicleThumbnail ||
        "";
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

    const documents = [
        {
            key: "billOfSaleDocument" as const,
            documentType: "bill_of_sale_document",
            label: t("AuthenticatedView.bill_of_sale"),
            href: vehicle.vehicleBillOfSaleDocument,
            viewLabel: t("AuthenticatedView.view_bill_of_sale"),
        },
        {
            key: "titleDocument" as const,
            documentType: "title_document",
            label: t("AuthenticatedView.title_document"),
            href: vehicle.vehicleTitleDocument,
            viewLabel: t("AuthenticatedView.view_title_document"),
        },
        {
            key: "billOfLadingDocument" as const,
            documentType: "bill_of_lading_document",
            label: t("AuthenticatedView.bill_of_lading"),
            href: vehicle.vehicleBillOfLadingDocument,
            viewLabel: t("AuthenticatedView.view_bill_of_lading"),
        },
        {
            key: "swbReleaseDocument" as const,
            documentType: "swb_release_document",
            label: t("AuthenticatedView.swb_release_document"),
            href: vehicle.vehicleSWBReleaseDocument,
            viewLabel: t("AuthenticatedView.view_swb_release_document"),
        },
    ];

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

    const renderFieldGrid = (fields: FieldConfig[]) => (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
            {fields.map((field) => (
                <div key={field.label}>
                    <dt className="text-sm font-medium text-gray-600">
                        {field.label}
                    </dt>
                    <dd className="mt-1 min-w-0 break-words text-sm font-semibold text-gray-900">
                        {isEditing && field.field === "shipping_status" ? (
                            <select
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                                value={vehicle.shipping_status}
                                onChange={handleChange("shipping_status")}
                            >
                                <option value="Not delivered">
                                    {t("AuthenticatedView.not_delivered")}
                                </option>
                                <option value="Delivered">
                                    {t("AuthenticatedView.delivered")}
                                </option>
                            </select>
                        ) : isEditing && field.field ? (
                            <input
                                type={field.type ?? "text"}
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                                value={vehicle[field.field] ?? ""}
                                onChange={handleChange(field.field)}
                            />
                        ) : field.field === "shipping_status" ? (
                            t(translateStatus(vehicle.shipping_status) as string)
                        ) : field.field ? (
                            vehicle[field.field] ?? ""
                        ) : (
                            field.value ?? ""
                        )}
                    </dd>
                </div>
            ))}
        </dl>
    );

    return (
        <>
            {(editVehicleError || saveError || documentFileError) && (
                <ErrorBanner>
                    {documentFileError ??
                        t((editVehicleError ?? saveError) as string)}
                </ErrorBanner>
            )}

            <AdminDeleteVehicleDialog
                vehicle={vehicle}
                isDeleteVehicleDialogOpen={isDeleteVehicleDialogOpen}
                setDeleteVehicleDialogOpen={setDeleteVehicleDialogOpen}
            />

            <div className="w-full max-w-full overflow-x-hidden bg-white pb-8 sm:overflow-visible">
                <div className="mx-auto w-full max-w-full py-3 sm:max-w-none">
                    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
                        <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[9rem_1fr_auto] lg:items-center">
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

                            <div className="flex flex-col gap-3 sm:flex-row">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={handleSave}
                                            disabled={isEditVehicleLoading}
                                            className="inline-flex cursor-pointer justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-75"
                                        >
                                            {isEditVehicleLoading
                                                ? t("AuthenticatedView.saving")
                                                : t("AuthenticatedView.save")}
                                        </button>
                                        <button
                                            onClick={cancelEditing}
                                            disabled={isEditVehicleLoading}
                                            className="inline-flex cursor-pointer justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-75"
                                        >
                                            {t("AuthenticatedView.cancel")}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={startEditing}
                                            className="inline-flex cursor-pointer justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
                                        >
                                            {t("AuthenticatedView.edit")}
                                        </button>
                                        <button
                                            onClick={() =>
                                                setDeleteVehicleDialogOpen(true)
                                            }
                                            className="inline-flex cursor-pointer justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500"
                                        >
                                            {t("AuthenticatedView.delete")}
                                        </button>
                                    </>
                                )}
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
                                    {documents.map((document) => (
                                        <div key={document.label}>
                                            <p className="text-sm font-medium text-gray-600">
                                                {document.label}
                                            </p>
                                            {document.href &&
                                            !deleteDocumentTypes.includes(
                                                document.documentType
                                            ) ? (
                                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                                    <a
                                                        href={document.href}
                                                        target="_blank"
                                                        rel="noopener"
                                                        className="inline-flex text-sm font-semibold text-primary hover:text-primary-hover"
                                                    >
                                                        {document.viewLabel}
                                                    </a>
                                                    {isEditing && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDeleteDocumentTypes(
                                                                    (prev) =>
                                                                        prev.includes(
                                                                            document.documentType
                                                                        )
                                                                            ? prev
                                                                            : [
                                                                                  ...prev,
                                                                                  document.documentType,
                                                                              ]
                                                                )
                                                            }
                                                            className="inline-flex size-5 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                                                            aria-label={`Remove ${document.label}`}
                                                        >
                                                            <XMarkIcon className="size-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : deleteDocumentTypes.includes(
                                                  document.documentType
                                              ) ? (
                                                <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                                                    {t("AuthenticatedView.removed_on_save")}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDeleteDocumentTypes(
                                                                (prev) =>
                                                                    prev.filter(
                                                                        (
                                                                            type
                                                                        ) =>
                                                                            type !==
                                                                            document.documentType
                                                                    )
                                                            )
                                                        }
                                                        className="rounded-full hover:bg-red-100"
                                                        aria-label={`${t("AuthenticatedView.undo_remove")} ${document.label}`}
                                                    >
                                                        <XMarkIcon className="size-4" />
                                                    </button>
                                                </span>
                                            ) : !isEditing ? (
                                                <span className="mt-1 inline-flex text-sm font-semibold text-red-600">
                                                    {t("AuthenticatedView.none")}
                                                </span>
                                            ) : null}
                                            {isEditing && (
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-primary-100 px-3 py-1.5 text-xs font-semibold text-primary shadow-xs hover:bg-primary-100/70">
                                                        {t("AuthenticatedView.choose_file")}
                                                        <input
                                                            type="file"
                                                            accept={
                                                                DOCUMENT_FILE_ACCEPT
                                                            }
                                                            className="sr-only"
                                                            onChange={(event) => {
                                                                const file =
                                                                    event.target
                                                                        .files?.[0] ??
                                                                    null;

                                                                if (
                                                                    file &&
                                                                    !isDocumentFile(
                                                                        file
                                                                    )
                                                                ) {
                                                                    setDocumentFileError(
                                                                        "Please choose a document file: PDF, Word, Excel, CSV, TXT, RTF, or ODT."
                                                                    );
                                                                    event.target.value =
                                                                        "";
                                                                    return;
                                                                }

                                                                setDocumentFileError(
                                                                    null
                                                                );
                                                                setDocumentFiles(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [document.key]:
                                                                            file,
                                                                    })
                                                                );
                                                                setDeleteDocumentTypes(
                                                                    (prev) =>
                                                                        prev.filter(
                                                                            (
                                                                                type
                                                                            ) =>
                                                                                type !==
                                                                                document.documentType
                                                                        )
                                                                );
                                                                event.target.value =
                                                                    "";
                                                            }}
                                                        />
                                                    </label>
                                                    {documentFiles[
                                                        document.key
                                                    ] && (
                                                        <span className="inline-flex max-w-52 items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-gray-700">
                                                            <span className="truncate">
                                                                {
                                                                    documentFiles[
                                                                        document
                                                                            .key
                                                                    ]?.name
                                                                }
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setDocumentFiles(
                                                                        (
                                                                            prev
                                                                        ) => ({
                                                                            ...prev,
                                                                            [document.key]:
                                                                                null,
                                                                        })
                                                                    )
                                                                }
                                                                className="shrink-0 rounded-full text-red-600 hover:bg-red-100 hover:text-red-700"
                                                                aria-label={`Remove ${document.label}`}
                                                            >
                                                                <XMarkIcon className="size-4" />
                                                            </button>
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {isEditing && (
                                <section className="w-full min-w-0 max-w-full rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {t("AuthenticatedView.edit_images")}
                                    </h2>
                                    <div className="mt-4 border-t border-gray-200 pt-4">
                                        <ZipImagePreviewer
                                            files={imageFiles}
                                            setFiles={setImageFiles}
                                            setUploadFiles={
                                                setUploadImageFiles
                                            }
                                            thumbnail={thumbnail}
                                            setThumbnail={setThumbnail}
                                            preferredThumbnailName={
                                                vehicle.vehicleThumbnailName ??
                                                vehicle.vehicleThumbnail
                                            }
                                        />
                                    </div>
                                </section>
                            )}
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
        </>
    );
};

export default AdminVehiclePage;
