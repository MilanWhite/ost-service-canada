import { useCallback, useEffect, useState } from "react";

const ADMIN_DASHBOARD_VISIBILITY_KEY = "ost-admin-dashboard-visible";

const getStoredAdminDashboardVisibility = () =>
    window.localStorage.getItem(ADMIN_DASHBOARD_VISIBILITY_KEY) === "true";

export function useAdminDashboardVisibility() {
    const [isAdminDashboardVisible, setIsAdminDashboardVisible] = useState(
        getStoredAdminDashboardVisibility
    );

    useEffect(() => {
        const handleStorage = () => {
            setIsAdminDashboardVisible(getStoredAdminDashboardVisibility());
        };

        window.addEventListener("storage", handleStorage);
        window.addEventListener(
            "admin-dashboard-visibility-change",
            handleStorage
        );

        return () => {
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener(
                "admin-dashboard-visibility-change",
                handleStorage
            );
        };
    }, []);

    const setAdminDashboardVisible = useCallback((visible: boolean) => {
        window.localStorage.setItem(
            ADMIN_DASHBOARD_VISIBILITY_KEY,
            String(visible)
        );
        setIsAdminDashboardVisible(visible);
        window.dispatchEvent(new Event("admin-dashboard-visibility-change"));
    }, []);

    return {
        isAdminDashboardVisible,
        setAdminDashboardVisible,
    };
}
