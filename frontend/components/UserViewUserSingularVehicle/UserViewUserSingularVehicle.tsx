import { useLayoutEffect } from "react";
import UserVehiclePage from "../../components/UserVehiclePage";

import { Navigate, useParams } from "react-router-dom";

import { useGetVehicle } from "../../hooks/useGetSingularVehicle";

import { URLS } from "../../src/config/navigation";

import BackButton from "../../components/BackButton";
import ErrorBanner from "../../components/ErrorBanner";
import { useTranslation } from "react-i18next";

import { useAuthenticator } from "@aws-amplify/ui-react";

import SingularVehiclePageSkeleton from "../Skeletons/SingularVehiclePageSkeleton";

const UserViewUserSingularVehicle = () => {
    const { t } = useTranslation();

    const { user } = useAuthenticator((ctx) => [ctx.user]);

    const { vehicle_id } = useParams<{
        vehicle_id?: string;
    }>();

    const { vehicle, vehicleError } = useGetVehicle(
        user?.userId ?? "",
        vehicle_id ?? "",
    );

    useLayoutEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, [vehicle_id]);

    if (!user || !vehicle_id) {
        return <Navigate to="/404" replace />;
    }

    return (
        <>
            <div className="mb-2 flex h-10 items-center gap-x-3 sm:mb-3">
                <BackButton href={URLS.vehicles} compact />
                <div className="border-l border-gray-200 pl-3">
                    <p className="text-xs font-medium text-gray-500">
                        {t("AuthenticatedView.back_to")}
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                        {t("AuthenticatedView.my_vehicles")}
                    </p>
                </div>
            </div>
            {vehicleError && (
                <ErrorBanner>{t(vehicleError as string)}</ErrorBanner>
            )}
            {vehicle ? (
                <>
                    <UserVehiclePage vehicle={vehicle!} />
                </>
            ) : (
                <SingularVehiclePageSkeleton />
            )}
        </>
    );
};

export default UserViewUserSingularVehicle;
