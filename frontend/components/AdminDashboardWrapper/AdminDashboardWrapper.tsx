import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { UserGroupIcon, HomeIcon } from "@heroicons/react/24/outline";

import GenericDashboardWrapper from "../GenericDashboardWrapper";
import { URLS } from "../../src/config/navigation";
import { FEATURE_FLAGS } from "../../src/config/featureFlags";
import { getAvatarSrc } from "../../src/config/AvatarConfig";
import { useGetAllUsers } from "../../hooks/useGetAllUsers";

import { DashboardNavigation } from "../GenericDashboardWrapper/GenericDashboardWrapper";

const baseNavigation: Omit<DashboardNavigation, "current">[] = [
    {
        name: "AuthenticatedView.dashboard",
        href: URLS.adminHome,
        icon: HomeIcon,
    },
    {
        name: "AuthenticatedView.client_manager",
        href: URLS.adminClientManager,
        icon: UserGroupIcon,
    },
].filter(
    (item) =>
        !FEATURE_FLAGS.hideAdminDashboard || item.href !== URLS.adminHome
);

interface Props {
    children: ReactNode;
}

const AdminDashboardWrapper = ({ children }: Props) => {
    const { pathname } = useLocation();
    const { allUsers } = useGetAllUsers();
    const showClientLinks = pathname.startsWith("/admin/clients/");

    const clientLinks = allUsers.map((user) => {
        const href = URLS.adminViewClientVehicles(user.sub);
        const needsPasswordChange =
            user.cognito_status === "FORCE_CHANGE_PASSWORD";

        return {
            name: user.username || user.email,
            href,
            current: pathname.startsWith(href),
            imageSrc: getAvatarSrc(
                user.email,
                needsPasswordChange
                    ? {
                          background: "FEE2E2",
                          color: "DC2626",
                      }
                    : undefined
            ),
        };
    });

    // set current selected nav
    const dashboardNavigation: DashboardNavigation[] = baseNavigation.map(
        (item) => ({
            ...item,
            current: pathname === item.href,
            children:
                item.href === URLS.adminClientManager && showClientLinks
                    ? clientLinks
                    : undefined,
        })
    );

    return (
        <GenericDashboardWrapper
            homeURL={
                FEATURE_FLAGS.hideAdminDashboard
                    ? URLS.adminClientManager
                    : URLS.adminHome
            }
            dashboardNavigation={dashboardNavigation}
            dashboardUserNavigation={[]}
        >
            {children}
        </GenericDashboardWrapper>
    );
};

export default AdminDashboardWrapper;
