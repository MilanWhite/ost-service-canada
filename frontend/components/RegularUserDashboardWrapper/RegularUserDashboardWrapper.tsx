import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { TruckIcon, HomeIcon } from "@heroicons/react/24/outline";

import GenericDashboardWrapper from "../GenericDashboardWrapper";
import { URLS } from "../../src/config/navigation";
import { DashboardNavigation } from "../GenericDashboardWrapper/GenericDashboardWrapper";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { useTranslation } from "react-i18next";
import { useGetUser } from "../../hooks/useGetUser";
import apiClient from "../../services/api-client";
import EmailNotificationToggle from "./EmailNotificationToggle";

const baseNavigation: Omit<DashboardNavigation, "current">[] = [
    { name: "AuthenticatedView.dashboard", href: URLS.home, icon: HomeIcon },
    {
        name: "AuthenticatedView.my_vehicles",
        href: "/vehicles",
        icon: TruckIcon,
    },
];

interface Props {
    children: ReactNode;
}

const RegularUserDashboardWrapper = ({ children }: Props) => {
    const { pathname } = useLocation();
    const { i18n } = useTranslation();
    const { user: authUser } = useAuthenticator((context) => [context.user]);
    const sub = authUser?.userId;
    const { user, userRefetch } = useGetUser(sub);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [preferenceLoading, setPreferenceLoading] = useState(false);
    const [preferenceError, setPreferenceError] = useState(false);

    useEffect(() => {
        if (user) setNotificationsEnabled(user.email_notifications_enabled);
    }, [user]);

    const updatePreferences = async (payload: {
        email_notifications_enabled?: boolean;
        notification_language?: "en" | "ru" | "uk";
    }) => {
        if (!sub) return;
        setPreferenceLoading(true);
        setPreferenceError(false);
        try {
            await apiClient.put(`/api/main/${sub}/notification-preferences`, payload);
            await userRefetch();
        } catch {
            setPreferenceError(true);
            if (user) setNotificationsEnabled(user.email_notifications_enabled);
        } finally {
            setPreferenceLoading(false);
        }
    };

    useEffect(() => {
        const language = (i18n.resolvedLanguage ?? i18n.language).split("-")[0];
        if (
            user &&
            ["en", "ru", "uk"].includes(language) &&
            user.notification_language !== language
        ) {
            void updatePreferences({
                notification_language: language as "en" | "ru" | "uk",
            });
        }
        // updatePreferences intentionally uses the latest authenticated user.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [i18n.resolvedLanguage, user?.notification_language, sub]);

    // derive current flag
    const dashboardNavigation: DashboardNavigation[] = baseNavigation.map(
        (item) => ({
            ...item,
            current: pathname === item.href,
        })
    );

    return (
        <GenericDashboardWrapper
            homeURL={URLS.home}
            dashboardNavigation={dashboardNavigation}
            dashboardUserNavigation={[]}
            sidebarFooter={
                <EmailNotificationToggle
                    checked={notificationsEnabled}
                    disabled={preferenceLoading || !user}
                    error={preferenceError}
                    onChange={(checked) => {
                        setNotificationsEnabled(checked);
                        void updatePreferences({
                            email_notifications_enabled: checked,
                        });
                    }}
                />
            }
        >
            {children}
        </GenericDashboardWrapper>
    );
};

export default RegularUserDashboardWrapper;
