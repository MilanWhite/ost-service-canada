import React, { ReactNode, useState } from "react";
import { useLocation } from "react-router-dom";

import DesktopSidebar from "./DesktopSidebar";
import MobileSidebar from "./MobileSidebar";
import DashboardNavbar from "./DashboardNavbar";
import { URLS } from "../../src/config/navigation";

export interface DashboardNavigation {
    name: string;
    href: string;
    icon: React.ForwardRefExoticComponent<
        Omit<React.SVGProps<SVGSVGElement>, "ref">
    >;
    current?: boolean;
    children?: DashboardNavigationChild[];
}

export interface DashboardNavigationChild {
    name: string;
    href: string;
    current?: boolean;
    imageSrc?: string;
    label?: string;
}

export interface DashboardUserNavigation {
    name: string;
    href: string;
}

interface Props {
    children: ReactNode;
    homeURL: string;
    dashboardNavigation: DashboardNavigation[];
    dashboardUserNavigation: DashboardUserNavigation[];
    sidebarFooter?: ReactNode;
}

const GenericDashboardWrapper = ({
    children,
    homeURL,

    dashboardNavigation,
    dashboardUserNavigation,
    sidebarFooter,
}: Props) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { pathname } = useLocation();

    const isVehiclePage =
        pathname.startsWith(`${URLS.vehicles}/`) ||
        /^\/admin\/clients\/[^/]+\/vehicles(\/|$)/.test(pathname);

    return (
        <>
            <div>
                {/* MOBILE SIDEBAR  */}
                <MobileSidebar
                    dashboardNavigation={dashboardNavigation}
                    sidebarFooter={sidebarFooter}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                />
                {/* Static sidebar for desktop */}
                <DesktopSidebar
                    homeURL={homeURL}
                    dashboardNavigation={dashboardNavigation}
                    sidebarFooter={sidebarFooter}
                />

                <div className="lg:relative lg:pl-72">
                    <DashboardNavbar
                        dashboardUserNavigation={dashboardUserNavigation}
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                    />
                    <main
                        className={
                            isVehiclePage
                                ? "pt-6 pb-10"
                                : "pt-6 pb-10 lg:pt-[5.5rem]"
                        }
                    >
                        <div className="px-4 sm:px-6 lg:px-12">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
};

export default GenericDashboardWrapper;
