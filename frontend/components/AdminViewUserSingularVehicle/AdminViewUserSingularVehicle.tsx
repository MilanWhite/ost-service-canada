import AdminVehiclePage from "../../components/AdminVehiclePage";

import { Navigate, useParams } from "react-router-dom";

import { useGetVehicle } from "../../hooks/useGetSingularVehicle";
import { useGetUser } from "../../hooks/useGetUser";

import { URLS } from "../../src/config/navigation";

import BackButton from "../../components/BackButton";
import ErrorBanner from "../../components/ErrorBanner";
import { useTranslation } from "react-i18next";
import SingularVehiclePageSkeleton from "../Skeletons/SingularVehiclePageSkeleton";

const AdminViewUserSingularVehicle = () => {
    const { t } = useTranslation();

    const { sub, vehicle_id } = useParams<{
        sub?: string;
        vehicle_id?: string;
    }>();

    const { vehicle, vehicleError } = useGetVehicle(
        sub ?? "",
        vehicle_id ?? "",
    );
    const { user, userError } = useGetUser(sub);

    if (!sub || !vehicle_id) {
        return <Navigate to="/404" replace />;
    }

    return (
        <>
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 sm:mb-3">
                <BackButton
                    href={URLS.adminViewClientVehicles(sub)}
                    compact
                />
                {(user?.username || vehicle?.user_email) && (
                    <div className="border-l border-gray-200 pl-3">
                        <p className="text-xs font-medium text-gray-500">
                            {t("AuthenticatedView.vehicle_owner")}
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                            {user?.username ?? vehicle?.user_email}
                        </p>
                    </div>
                )}
            </div>
            {vehicleError && (
                <ErrorBanner>{t(vehicleError as string)}</ErrorBanner>
            )}
            {userError && <ErrorBanner>{t(userError as string)}</ErrorBanner>}
            {vehicle ? (
                <>
                    <AdminVehiclePage vehicle={vehicle!} />
                </>
            ) : (
                <SingularVehiclePageSkeleton />
            )}
        </>
    );
};

export default AdminViewUserSingularVehicle;
