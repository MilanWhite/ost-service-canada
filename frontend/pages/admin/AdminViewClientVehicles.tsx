import AdminDashboardWrapper from "../../components/AdminDashboardWrapper";

import { CreateVehicleContextProvider } from "../../contexts/CreateVehicleContext";

import AdminViewUserVehicles from "../../components/AdminViewUserVehicles";

export function AdminViewClientVehicles() {
    return (
        <>
            <CreateVehicleContextProvider>
                <AdminDashboardWrapper>
                    <AdminViewUserVehicles />
                </AdminDashboardWrapper>
            </CreateVehicleContextProvider>
        </>
    );
}
