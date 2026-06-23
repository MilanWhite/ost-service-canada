import { useGetVehicles } from "../../hooks/useGetVehicles";
import { useGetUser } from "../../hooks/useGetUser";
import { Navigate, useParams } from "react-router-dom";
import ErrorBanner from "../../components/ErrorBanner";
import UserBanner from "../../components/UserBanner";
import AdminVehicleItemCard from "../../components/AdminVehicleItemCard";
import Pagination from "../../components/Pagination";
import SearchBar from "../../components/SearchBar";
import Dropdown from "../../components/Dropdown";

import { useCreateVehicle } from "../../contexts/CreateVehicleContext";

import AdminCreateVehicleDialog from "../../components/AdminCreateVehicleDialog";
import SuccessBanner from "../../components/SuccessBanner";
import { useState } from "react";
import {
    VehicleFilterField,
    VehicleStatusFilter,
} from "../../src/types/types";

import {
    VehicleFilterChoices,
    VehicleStatusFilterChoices,
} from "../../src/types/types";
import { useTranslation } from "react-i18next";
import VehicleCardSkeleton from "../Skeletons/VehicleCardSkeleton";

import UserBannerSkeleton from "../Skeletons/UserBannerSkeleton";
import BackButton from "../BackButton";
import { URLS } from "../../src/config/navigation";
import { VEHICLES_PER_PAGE } from "../../src/config/pagination";

const AdminViewUserVehicles = () => {
    const { t } = useTranslation();

    const { sub } = useParams<{ sub: string }>();
    const { user, userError } = useGetUser(sub!);

    const { showCreateVehicleSuccess, setShowCreateVehicleSuccess } =
        useCreateVehicle(); // context

    const [vehicleSearch, setVehicleSearch] = useState<string>("");
    const [vehicleFilterBy, setVehicleFilterBy] =
        useState<VehicleFilterField>("default");
    const [vehicleStatusFilter, setVehicleStatusFilter] =
        useState<VehicleStatusFilter>("both");

    const {
        vehicles,
        meta,
        vehiclesLoading,
        vehiclesError,
        setPage,
        vehicleRefetch,
    } = useGetVehicles(sub!, VEHICLES_PER_PAGE, {
        vehicleSearch,
        vehicleFilterBy,
        vehicleStatusFilter,
    });

    if (!sub) {
        return <Navigate to="/404" replace />;
    }

    return (
        <>
            {user && (
                <AdminCreateVehicleDialog
                    user={user}
                    vehicleRefetch={vehicleRefetch}
                />
            )}
            {showCreateVehicleSuccess && (
                <SuccessBanner
                    onClick={() => {
                        setShowCreateVehicleSuccess(false);
                    }}
                >
                    {t("AuthenticatedView.Success.vehicle_added_successfully")}
                </SuccessBanner>
            )}
            {vehiclesError && (
                <ErrorBanner>{t(vehiclesError as string)}</ErrorBanner>
            )}
            {userError && <ErrorBanner>{t(userError as string)}</ErrorBanner>}

            <div className="mb-3 flex h-10 items-center gap-x-3">
                <BackButton href={URLS.adminClientManager} compact />
                <div className="border-l border-gray-200 pl-3">
                    <p className="text-xs font-medium text-gray-500">
                        {t("AuthenticatedView.back_to")}
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                        {t("AuthenticatedView.client_manager")}
                    </p>
                </div>
            </div>

            {user ? (
                <>
                    <UserBanner user={user} />
                </>
            ) : (
                <UserBannerSkeleton />
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end">
                <div className="flex flex-col sm:justify-end sm:items-end mt-2 sm:mt-0">
                    <div>
                        <p className="hidden sm:block text-2xl text-base font-semibold text-gray-900">
                            {user?.username}
                            {user?.username && "'s"}{" "}
                            {t("AuthenticatedView.vehicles")}:
                        </p>

                        {vehicleSearch && (
                            <p className="text-sm text-gray-600">
                                {" "}
                                {t("AuthenticatedView.show_results_for")}{" "}
                                {vehicleSearch},{" "}
                                {t("AuthenticatedView.filtered_by")}{" "}
                                {t(
                                    VehicleFilterChoices[
                                        `${vehicleFilterBy}`
                                    ] as string
                                )}
                            </p>
                        )}
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(5rem,0.55fr)_minmax(5rem,0.55fr)] gap-2 sm:flex sm:space-x-4 sm:gap-0 md:mt-0 md:ml-auto">
                    <SearchBar setSearch={setVehicleSearch} />
                    <Dropdown
                        title={"AuthenticatedView.filter_by"}
                        options={VehicleFilterChoices}
                        onChange={(e) =>
                            setVehicleFilterBy(
                                e.target.value as VehicleFilterField
                            )
                        }
                    />
                    <Dropdown
                        title={"AuthenticatedView.status"}
                        options={VehicleStatusFilterChoices}
                        onChange={(e) =>
                            setVehicleStatusFilter(
                                e.target.value as VehicleStatusFilter
                            )
                        }
                    />
                </div>
            </div>

            {!vehiclesLoading ? (
                vehicles.map((vehicle) => (
                    <AdminVehicleItemCard key={vehicle.id} vehicle={vehicle} />
                ))
            ) : (
                <>
                    <VehicleCardSkeleton type="Admin" />
                    <VehicleCardSkeleton type="Admin" appear_size="sm" />
                    <VehicleCardSkeleton type="Admin" appear_size="lg" />
                </>
            )}

            <div className="py-6">
                <Pagination meta={meta} setPage={setPage} />
            </div>
        </>
    );
};

export default AdminViewUserVehicles;
