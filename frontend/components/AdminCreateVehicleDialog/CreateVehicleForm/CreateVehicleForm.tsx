import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import useCreateVehicleForm, {
    CreateVehicleInfo,
    CreateVehicleMedia,
} from "../../../hooks/useCreateVehicleForm";

import useDecodeVin from "../../../hooks/useDecodeVin";

import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/20/solid";

import ErrorBanner from "../../ErrorBanner";
import ErrorText from "../../ErrorText";

import { useCreateVehicle } from "../../../contexts/CreateVehicleContext";
import { User } from "../../../hooks/interfaces";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import {
    DOCUMENT_FILE_ACCEPT,
    isDocumentFile,
} from "../../../src/config/fileTypes";

import ZipImagePreview from "../../ZipImagePreviewer";

export const createVehicleSchema = z.object({
    lotNumber: z
        .string()
        .trim()
        .max(50, { message: "AuthenticatedView.Errors.exceeded_length" }),

    auctionName: z
        .string()
        .trim()
        .max(100, { message: "AuthenticatedView.Errors.exceeded_length" }),

    location: z
        .string()
        .trim()
        .max(100, { message: "AuthenticatedView.Errors.exceeded_length" }),

    shippingStatus: z
        .string()
        .trim()
        .max(50, { message: "AuthenticatedView.Errors.exceeded_length" }),

    // ─── Prices (regex unchanged) ─────────────────────────────────────────────
    priceDelivery: z
        .string()
        .trim()
        .regex(/^(?:\d+(?:\.\d{1,2})?)?$/, {
            message: "AuthenticatedView.Errors.delivery_price_invalid",
        }),

    priceShipping: z
        .string()
        .trim()
        .regex(/^(?:\d+(?:\.\d{1,2})?)?$/, {
            message: "AuthenticatedView.Errors.shipping_price_invalid",
        }),

    // ─── Logistics / Dispatch ────────────────────────────────────────────────
    deliveryAddress: z.string().trim(),

    portOfOrigin: z
        .string()
        .trim()
        .max(255, { message: "AuthenticatedView.Errors.exceeded_length" }),

    portOfDestination: z
        .string()
        .trim()
        .max(255, { message: "AuthenticatedView.Errors.exceeded_length" }),

    receiverId: z
        .string()
        .trim()
        .max(255, { message: "AuthenticatedView.Errors.exceeded_length" }),

    // ─── Vehicle Details ─────────────────────────────────────────────────────
    vin: z.string()
        .trim()
        .toUpperCase()
        .regex(/^[A-HJ-NPR-Z0-9]{17}$/, { message: "AuthenticatedView.Errors.invalid_vin" }),

    modelYear: z
        .string()
        .trim()
        .max(10, { message: "AuthenticatedView.Errors.exceeded_length" }),

    make: z
        .string()
        .trim()
        .max(100, { message: "AuthenticatedView.Errors.exceeded_length" }),

    powertrain: z
        .string()
        .trim()
        .max(50, { message: "AuthenticatedView.Errors.exceeded_length" }),

    model: z
        .string()
        .trim()
        .max(100, { message: "AuthenticatedView.Errors.exceeded_length" }),

    color: z
        .string()
        .trim()
        .max(30, { message: "AuthenticatedView.Errors.exceeded_length" }),
});

type FormData = z.infer<typeof createVehicleSchema>;

interface Props {
    user: User;
    vehicleRefetch: () => void;
}

const CreateVehicleForm = ({ user, vehicleRefetch }: Props) => {
    const { t } = useTranslation();

    const { createVehicle, isCreateVehicleLoading, createVehicleError } =
        useCreateVehicleForm(user);

    const { closeCreateVehicle } = useCreateVehicle();

    const [files, setFiles] = useState<File[]>([]);
    const [thumbnail, setThumbnail] = useState<File | null>(null);

    const [videos, setVideos] = useState<File[]>([]);
    const [documentFileError, setDocumentFileError] = useState<string | null>(
        null
    );
    const [documentFiles, setDocumentFiles] = useState({
        billOfSaleDocument: null as File | null,
        titleDocument: null as File | null,
        billOfLadingDocument: null as File | null,
        swbReleaseDocument: null as File | null,
    });

    const onSubmit = async (data: FormData) => {
        if (!decodedVin || searchedVin !== data.vin) {
            setError("vin", {
                type: "manual",
                message: "Please search the VIN before creating the vehicle.",
            });
            return;
        }

        const createVehicleInfo: CreateVehicleInfo = {
            lotNumber: data.lotNumber,
            auctionName: data.auctionName,
            location: data.location,
            shippingStatus: data.shippingStatus,
            priceDelivery: data.priceDelivery,
            priceShipping: data.priceShipping,

            deliveryAddress: data.deliveryAddress,
            portOfOrigin: data.portOfOrigin,
            portOfDestination: data.portOfDestination,
            receiverId: data.receiverId,

            vin: data.vin,
            modelYear: data.modelYear,
            make: data.make,
            powertrain: data.powertrain,
            model: data.model,
            color: data.color,
            destination: "",
            etd: "",
            eta: "",
        };

        const createVehicleMedia: CreateVehicleMedia = {
            images: files,
            thumbnail: thumbnail,
            videos: videos,
            ...documentFiles,
        };

        await createVehicle(
            createVehicleInfo,
            createVehicleMedia,
            vehicleRefetch
        );
    };

    const {
        register,
        watch,
        setValue,
        setError,
        clearErrors,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(createVehicleSchema),
        defaultValues: {
            lotNumber: "",
            auctionName: "",
            location: "",
            shippingStatus: "Not delivered",
            priceDelivery: "",
            priceShipping: "",
            deliveryAddress: "",
            portOfOrigin: "",
            portOfDestination: "",
            receiverId: "",
            vin: "",
            modelYear: "",
            make: "",
            powertrain: "",
            model: "",
            color: "",
        },
    });

    // VIN DECODE LOGIC
    const [vinState, setVinState] = useState<string>("");
    const [searchedVin, setSearchedVin] = useState<string | null>(null);
    const watched_vin = watch("vin");
    const watchedModelYear = watch("modelYear");
    const watchedMake = watch("make");
    const watchedModel = watch("model");
    useEffect(() => {
        const normalizedVin = (watched_vin ?? "").trim().toUpperCase();
        setVinState(normalizedVin);

        if (searchedVin && searchedVin !== normalizedVin) {
            setSearchedVin(null);
        }
    }, [watched_vin, searchedVin]);

    const {decodeVin, decodedVin, isDecoding, decodeError} = useDecodeVin()

    const handleDecodeVin = async () => {
        const normalizedVin = vinState.trim().toUpperCase();
        setValue("vin", normalizedVin, { shouldValidate: true });

        const wasDecoded = await decodeVin(normalizedVin);
        setSearchedVin(wasDecoded ? normalizedVin : null);

        if (wasDecoded) {
            clearErrors("vin");
        }
    };

    useEffect(() => {
        const newModelYear = decodedVin?.modelYear
        if (newModelYear) {
            setValue('modelYear', newModelYear, { shouldValidate: true });
        }
        const newMake = decodedVin?.make
        if (newMake) {
            setValue('make', newMake, { shouldValidate: true });
        }
        const newPowertrain = decodedVin?.powertrain
        if (newPowertrain) {
            setValue('powertrain', newPowertrain, { shouldValidate: true });
        }
        const newModel = decodedVin?.model
        if (newModel) {
            setValue('model', newModel, { shouldValidate: true });
        }
    }, [decodedVin, setValue])

    const vehicleTitle = [
        watchedModelYear,
        watchedMake,
        watchedModel,
        searchedVin,
    ].filter(Boolean).join(" ");

    const documentUploadButtons = [
        {
            key: "billOfSaleDocument" as const,
            label: t("AuthenticatedView.bill_of_sale"),
        },
        {
            key: "titleDocument" as const,
            label: t("AuthenticatedView.title_document"),
        },
        {
            key: "billOfLadingDocument" as const,
            label: t("AuthenticatedView.bill_of_lading"),
        },
        {
            key: "swbReleaseDocument" as const,
            label: t("AuthenticatedView.swb_release_document"),
        },
    ];



    return (
        <>
            <form
                action="#"
                method="POST"
                className="relative px-6 pt-2 pb-6 lg:px-8 lg:pt-2 lg:pb-12"
                onSubmit={handleSubmit(onSubmit)}
            >
                {createVehicleError && (
                    <ErrorBanner>{t(createVehicleError as string)}</ErrorBanner>
                )}
                {documentFileError && (
                    <ErrorBanner>{documentFileError}</ErrorBanner>
                )}

                <div>
                    <div className="mb-3">
                        <div>
                            <label className="block mb-1 font-medium">
                                {t("AuthenticatedView.upload_media")}
                            </label>
                            <p className="mb-2 text-sm text-gray-600">
                                {t(
                                    "AuthenticatedView.upload_media_description"
                                )}
                            </p>

                            <ZipImagePreview
                                files={files}
                                setFiles={setFiles}
                                thumbnail={thumbnail}
                                setThumbnail={setThumbnail}
                                videos={videos}
                                setVideos={setVideos}
                                allowVideos
                            />
                        </div>
                    </div>
                </div>

                <div className="mb-3">
                    <label className="block mb-2 text-sm font-semibold text-gray-900">
                        {t("AuthenticatedView.documents")}
                    </label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {documentUploadButtons.map((document) => (
                            <div
                                key={document.key}
                                className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-gray-200 px-2 py-1.5"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-medium text-gray-700">
                                        {document.label}
                                    </p>
                                    {documentFiles[document.key] && (
                                        <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-gray-700">
                                            <span className="truncate">
                                                {
                                                    documentFiles[document.key]
                                                        ?.name
                                                }
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setDocumentFiles(
                                                        (prev) => ({
                                                            ...prev,
                                                            [document.key]: null,
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
                                <label className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md bg-primary-100 px-3 py-1.5 text-xs font-semibold text-primary shadow-xs hover:bg-primary-100/70">
                                    Choose file
                                    <input
                                        type="file"
                                        accept={DOCUMENT_FILE_ACCEPT}
                                        className="sr-only"
                                        onChange={(event) => {
                                            const file =
                                                event.target.files?.[0] ?? null;

                                            if (
                                                file &&
                                                !isDocumentFile(file)
                                            ) {
                                                setDocumentFileError(
                                                    "Please choose a document file: PDF, Word, Excel, CSV, TXT, RTF, or ODT."
                                                );
                                                event.target.value = "";
                                                return;
                                            }

                                            setDocumentFileError(null);
                                            setDocumentFiles((prev) => ({
                                                ...prev,
                                                [document.key]: file,
                                            }));
                                            event.target.value = "";
                                        }}
                                    />
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                {searchedVin && (
                    <div className="my-3 rounded-md bg-green-50 px-4 py-3">
                        <p className="text-sm font-medium text-green-900">
                            {vehicleTitle}
                        </p>
                    </div>
                )}

                <div className="sm:col-span-2">
                    <label
                        htmlFor="vin"
                        className="block text-sm/6 font-semibold text-gray-900"
                    >
                        {t("AuthenticatedView.vin")}
                    </label>

                    <div className="mt-1.5 flex w-full items-start gap-3">
                        <input
                            id="vin"
                            type="text"
                            autoComplete="vin"
                            className="flex-1 min-w-0 rounded-md bg-white px-3.5 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                            {...register("vin")}
                        />

                        <button
                            type="button"
                            onClick={handleDecodeVin}
                            className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary-hover disabled:opacity-75 disabled:cursor-not-allowed"
                            disabled={isDecoding}
                        >
                            <MagnifyingGlassIcon className="w-5"/>
                        </button>
                    </div>

                    <ErrorText>
                        {errors.vin && t(errors.vin.message as string)}
                    </ErrorText>
                    <ErrorText>
                        {decodeError && t(decodeError as string)}
                    </ErrorText>
                </div>

                <div className="mt-1 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="modelYear"
                            className="block text-sm/6 font-semibold text-gray-900"
                        >
                            Year
                        </label>
                        <input
                            id="modelYear"
                            className={`mt-1.5 block w-full rounded-md px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-primary ${decodedVin?.modelYear && "bg-green-50"}`}
                            {...register("modelYear")}
                        />
                        <ErrorText>
                            {errors.modelYear &&
                                t(errors.modelYear.message as string)}
                        </ErrorText>
                    </div>

                    <div>
                        <label
                            htmlFor="make"
                            className="block text-sm/6 font-semibold text-gray-900"
                        >
                            Make
                        </label>
                        <input
                            id="make"
                            className={`mt-1.5 block w-full rounded-md px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-primary ${decodedVin?.make && "bg-green-50"}`}
                            {...register("make")}
                        />
                        <ErrorText>
                            {errors.make && t(errors.make.message as string)}
                        </ErrorText>
                    </div>

                    <div>
                        <label
                            htmlFor="model"
                            className="block text-sm/6 font-semibold text-gray-900"
                        >
                            {t("AuthenticatedView.model")}
                        </label>
                        <input
                            id="model"
                            className={`mt-1.5 block w-full rounded-md px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-primary ${decodedVin?.model && "bg-green-50"}`}
                            {...register("model")}
                        />
                        <ErrorText>
                            {errors.model && t(errors.model.message as string)}
                        </ErrorText>
                    </div>

                    <div>
                        <label
                            htmlFor="powertrain"
                            className="block text-sm/6 font-semibold text-gray-900"
                        >
                            {t("AuthenticatedView.powertrain")}
                        </label>
                        <input
                            id="powertrain"
                            className={`mt-1.5 block w-full rounded-md px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-primary ${decodedVin?.powertrain && "bg-green-50"}`}
                            {...register("powertrain")}
                        />
                        <ErrorText>
                            {errors.powertrain &&
                                t(errors.powertrain.message as string)}
                        </ErrorText>
                    </div>

                    <div className="sm:col-span-2">
                        <label
                            htmlFor="shippingStatus"
                            className="block text-sm/6 font-semibold text-gray-900"
                        >
                            {t("AuthenticatedView.shipping_status")}
                        </label>
                        <div className="mt-1.5 grid grid-cols-1">
                            <select
                                className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6"
                                id="shippingStatus"
                                {...register("shippingStatus")}
                            >
                                <option value="Not delivered">
                                    {t("AuthenticatedView.not_delivered")}
                                </option>
                                <option value="Delivered">
                                    {t("AuthenticatedView.delivered")}
                                </option>
                            </select>
                            <ChevronDownIcon
                                aria-hidden="true"
                                className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-3 sm:flex sm:flex-row-reverse">
                    <button
                        type="submit"
                        // onClick={}
                        disabled={isCreateVehicleLoading}
                        className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary-hover disabled:opacity-75 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                    >
                        {t("AuthenticatedView.add_vehicle")}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            closeCreateVehicle();
                        }}
                        disabled={isCreateVehicleLoading}
                        className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:opacity-75 disabled:cursor-not-allowed sm:mt-0 sm:w-auto mt-3"
                    >
                        {t("AuthenticatedView.cancel")}
                    </button>
                </div>
            </form>
        </>
    );
};

export default CreateVehicleForm;
