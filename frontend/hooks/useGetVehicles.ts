// hooks/usePaginatedVehicles.ts
import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "../services/api-client";
import { Vehicle, Meta } from "./interfaces";
import { VehicleFilterField, VehicleStatusFilter } from "../src/types/types";
import { CanceledError } from "axios";

export function useGetVehicles(
    userSub: string,
    perPage = 10,
    {
        vehicleSearch,
        vehicleFilterBy,
        vehicleStatusFilter = "both",
    }: {
        vehicleSearch?: string;
        vehicleFilterBy: VehicleFilterField | null;
        vehicleStatusFilter?: VehicleStatusFilter;
    }
): {
    vehicles: Vehicle[];
    meta: Meta;
    vehiclesLoading: boolean;
    vehiclesError: string | null;
    setPage: (page: number) => void;
    vehicleRefetch: () => Promise<void>;
} {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [page, setPageState] = useState(1);

    const [meta, setMeta] = useState<Meta>({
        page: 1,
        per_page: perPage,
        total_pages: 1,
        total_items: 0,
        has_next: false,
        has_prev: false,
    });
    const [vehiclesLoading, setLoading] = useState<boolean>(false);
    const [vehiclesError, setVehiclesError] = useState<string | null>(null);

    const fetchPage = useCallback(
        async (page: number) => {
            setLoading(true);
            setVehiclesError(null);

            try {
                const resp = await apiClient.get<{
                    message: { vehicles: Vehicle[]; meta: Meta };
                }>(`/api/main/${userSub}/vehicles`, {
                    params: {
                        page,
                        per_page: perPage,
                        vehicle_search: vehicleSearch,
                        vehicle_filter_by: vehicleFilterBy,
                        vehicle_status_filter: vehicleStatusFilter,
                    },
                });

                setVehicles(resp.data.message.vehicles);
                setMeta(resp.data.message.meta);
            } catch (err: unknown) {
                if (err instanceof CanceledError) return;

                setVehiclesError("AuthenticatedView.Errors.failed_to_load_vehicles");
            } finally {
                setLoading(false);
            }
        },
        [userSub, perPage, vehicleSearch, vehicleFilterBy, vehicleStatusFilter]
    );
    const queryKey = [
        userSub,
        perPage,
        vehicleSearch ?? "",
        vehicleFilterBy ?? "",
        vehicleStatusFilter,
    ].join("|");
    const previousQueryKey = useRef(queryKey);

    // Filter/search/status changes should restart pagination from the first page.
    useEffect(() => {
        if (!userSub) return;

        const queryChanged = previousQueryKey.current !== queryKey;

        if (queryChanged) {
            previousQueryKey.current = queryKey;

            if (page !== 1) {
                setPageState(1);
                return;
            }
        }

        fetchPage(page);
    }, [fetchPage, page, queryKey, userSub]);

    return {
        vehicles,
        meta,
        vehiclesLoading,
        vehiclesError,
        setPage: (page: number) =>
            setPageState(Math.max(1, Math.min(page, meta.total_pages))),
        vehicleRefetch: () => fetchPage(page),
    };
}
