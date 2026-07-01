import { ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UserGroupIcon, HomeIcon } from "@heroicons/react/24/outline";

import GenericDashboardWrapper from "../GenericDashboardWrapper";
import { URLS } from "../../src/config/navigation";
import { getAvatarSrc } from "../../src/config/AvatarConfig";
import { useGetAllUsers } from "../../hooks/useGetAllUsers";
import { useAdminDashboardVisibility } from "../../hooks/useAdminDashboardVisibility";
import AdminDashboardVisibilityToggle from "./AdminDashboardVisibilityToggle";

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
];

interface Props {
    children: ReactNode;
}

const AdminDashboardWrapper = ({ children }: Props) => {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { allUsers } = useGetAllUsers();
    const { isAdminDashboardVisible, setAdminDashboardVisible } =
        useAdminDashboardVisibility();
    const showClientLinks = pathname.startsWith("/admin/clients/");

    useEffect(() => {
        if (!isAdminDashboardVisible && pathname === URLS.adminHome) {
            navigate(URLS.adminClientManager, { replace: true });
        }
    }, [isAdminDashboardVisible, navigate, pathname]);

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
    const dashboardNavigation: DashboardNavigation[] = baseNavigation
        .filter(
            (item) => isAdminDashboardVisible || item.href !== URLS.adminHome
        )
        .map((item) => ({
            ...item,
            current: pathname === item.href,
            children:
                item.href === URLS.adminClientManager && showClientLinks
                    ? clientLinks
                    : undefined,
        }));

    return (
        <GenericDashboardWrapper
            homeURL={
                isAdminDashboardVisible
                    ? URLS.adminHome
                    : URLS.adminClientManager
            }
            dashboardNavigation={dashboardNavigation}
            dashboardUserNavigation={[]}
            sidebarFooter={
                <AdminDashboardVisibilityToggle
                    checked={isAdminDashboardVisible}
                    onChange={setAdminDashboardVisible}
                />
            }
        >
            {children}
        </GenericDashboardWrapper>
    );
};

export default AdminDashboardWrapper;
