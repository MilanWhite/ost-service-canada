import React, { ReactNode, useState } from "react";

import DesktopSidebar from "./DesktopSidebar";
import MobileSidebar from "./MobileSidebar";
import DashboardNavbar from "./DashboardNavbar";

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

    return (
        <>
            <div>
                {/* MOBILE SIDEBAR  */}
                <MobileSidebar
                    homeURL={homeURL}
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

                <div className="lg:pl-72">
                    <DashboardNavbar
                        dashboardUserNavigation={dashboardUserNavigation}
                        setSidebarOpen={setSidebarOpen}
                    />
                    <main className="py-10">
                        <div className="px-4 sm:px-6 lg:px-12">{children}</div>
                    </main>
                </div>
            </div>
        </>
    );
};

export default GenericDashboardWrapper;
