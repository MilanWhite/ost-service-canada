import { useState, useCallback } from "react";
import apiClient from "../services/api-client";
import { Vehicle } from "./interfaces";
import { CanceledError } from "axios";

export interface EditExtras {
    newImages?: File[];
    deleteKeys?: string[];
    newThumbnail?: File | null;
    imageOrder?: string[];
    billOfSaleDocument?: File | null;
    titleDocument?: File | null;
    billOfLadingDocument?: File | null;
    swbReleaseDocument?: File | null;
    deleteDocumentTypes?: string[];
}

export interface EditVehicleHook {
    vehicle: Vehicle;
    isEditing: boolean;
    isEditVehicleLoading: boolean;
    editVehicleError: string | null;
    startEditing(): void;
    cancelEditing(): void;
    handleChange(
        field: keyof Vehicle
    ): (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;

    saveChanges(extras?: EditExtras): Promise<void>;
}

export function useEditVehicle(
    initial: Vehicle,
    onSingularVehiclePage: boolean
): EditVehicleHook {
    const [vehicle, setVehicle] = useState<Vehicle>(initial);
    const [isEditing, setIsEditing] = useState(false);
    const [isEditVehicleLoading, setIsEditVehicleLoading] = useState(false);
    const [editVehicleError, setEditVehicleError] = useState<string | null>(
        null
    );

    const startEditing = useCallback(() => setIsEditing(true), []);
    const cancelEditing = useCallback(() => {
        setVehicle(initial);
        setIsEditing(false);
    }, [initial]);

    const handleChange = useCallback(
        (field: keyof Vehicle) =>
            (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
                setVehicle((v) => ({ ...v, [field]: e.target.value })),
        []
    );

    const saveChanges = useCallback(
        async (extras?: EditExtras) => {
            setIsEditVehicleLoading(true);
            try {
                const form = new FormData();
                form.append("payload", JSON.stringify(vehicle));

                extras?.newImages?.forEach((file) =>
                    form.append("new_images", file, file.name)
                );
                extras?.imageOrder?.forEach(name =>
                    form.append("image_order[]", name)
                );

                extras?.deleteKeys?.forEach((k) =>
                    form.append("delete_keys[]", k)
                );
                if (extras?.newThumbnail) {
                    form.append("new_thumbnail", extras?.newThumbnail)
                }
                if (extras?.billOfSaleDocument) {
                    form.append(
                        "billOfSaleDocument",
                        extras.billOfSaleDocument,
                        extras.billOfSaleDocument.name
                    );
                }
                if (extras?.titleDocument) {
                    form.append(
                        "titleDocument",
                        extras.titleDocument,
                        extras.titleDocument.name
                    );
                }
                if (extras?.billOfLadingDocument) {
                    form.append(
                        "billOfLadingDocument",
                        extras.billOfLadingDocument,
                        extras.billOfLadingDocument.name
                    );
                }
                if (extras?.swbReleaseDocument) {
                    form.append(
                        "swbReleaseDocument",
                        extras.swbReleaseDocument,
                        extras.swbReleaseDocument.name
                    );
                }
                extras?.deleteDocumentTypes?.forEach((documentType) =>
                    form.append("delete_document_types[]", documentType)
                );

                const { data } = await apiClient.put(
                    `/api/admin/vehicles/edit/${vehicle.id}/${
                        onSingularVehiclePage ? 1 : 0
                    }`,
                    form
                );

                setVehicle(data.message.vehicle);
                setIsEditing(false);
                setEditVehicleError(null);
            } catch (err) {
                if (!(err instanceof CanceledError)) {
                    setEditVehicleError(
                        "AuthenticatedView.Errors.failed_to_edit_vehicle"
                    );
                }
            } finally {
                setIsEditVehicleLoading(false);
            }
        },
        [vehicle, onSingularVehiclePage]
    );

    return {
        vehicle,
        isEditing,
        isEditVehicleLoading,
        editVehicleError,
        startEditing,
        cancelEditing,
        handleChange,
        saveChanges,
    };
}
