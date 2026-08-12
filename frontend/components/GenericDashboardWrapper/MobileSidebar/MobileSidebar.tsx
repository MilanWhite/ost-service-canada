import React, { ReactNode, useEffect } from "react";
import { DashboardNavigation } from "../GenericDashboardWrapper";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SidebarChildLinks from "../SidebarChildLinks";

interface Props {
    dashboardNavigation: DashboardNavigation[];
    sidebarFooter?: ReactNode;
    sidebarOpen: boolean;
    setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

function classNames(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

const MobileSidebar = ({
    dashboardNavigation,
    sidebarFooter,
    sidebarOpen,
    setSidebarOpen,
}: Props) => {
    const { t } = useTranslation();

    useEffect(() => {
        if (!sidebarOpen) return;

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setSidebarOpen(false);
        };

        document.addEventListener("keydown", closeOnEscape);
        return () => document.removeEventListener("keydown", closeOnEscape);
    }, [setSidebarOpen, sidebarOpen]);

    return (
        <div
            aria-hidden={!sidebarOpen}
            inert={!sidebarOpen}
            className={classNames(
                "fixed inset-x-0 bottom-0 top-16 z-50 flex lg:hidden",
                sidebarOpen ? "visible" : "invisible delay-300"
            )}
        >
            <button
                type="button"
                tabIndex={-1}
                aria-label={t("Common.close_sidebar")}
                onClick={() => setSidebarOpen(false)}
                className={classNames(
                    "fixed inset-x-0 bottom-0 top-16 bg-gray-900/80 transition-opacity duration-300 ease-linear",
                    sidebarOpen ? "opacity-100" : "opacity-0"
                )}
            />

            <aside
                id="mobile-dashboard-sidebar"
                className={classNames(
                    "relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex grow flex-col overflow-y-auto bg-white px-6 pb-4 pt-5">
                    <nav className="flex flex-1 flex-col">
                        <ul
                            role="list"
                            className="flex flex-1 flex-col gap-y-7"
                        >
                            <li>
                                <ul
                                    role="list"
                                    className="-mx-2 space-y-1"
                                >
                                    {dashboardNavigation.map((item) => (
                                        <li key={item.name}>
                                            <Link
                                                to={item.href}
                                                onClick={() =>
                                                    setSidebarOpen(false)
                                                }
                                                className={classNames(
                                                    item.current
                                                        ? "bg-gray-50 text-primary"
                                                        : "text-gray-700 hover:bg-gray-50 hover:text-primary-hover",
                                                    "group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold"
                                                )}
                                            >
                                                <item.icon
                                                    aria-hidden="true"
                                                    className={classNames(
                                                        item.current
                                                            ? "text-primary"
                                                            : "text-gray-400 group-hover:text-primary-hover",
                                                        "size-6 shrink-0"
                                                    )}
                                                />
                                                {t(item.name as string)}
                                            </Link>
                                            {item.children && (
                                                <SidebarChildLinks
                                                    childrenLinks={
                                                        item.children
                                                    }
                                                    onNavigate={() =>
                                                        setSidebarOpen(false)
                                                    }
                                                />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </li>
                            {sidebarFooter && (
                                <li className="mt-auto">{sidebarFooter}</li>
                            )}
                        </ul>
                    </nav>
                </div>
            </aside>
        </div>
    );
};

export default MobileSidebar;
