import { Menu, MenuItem, MenuItems } from "@headlessui/react";
import { Bars3Icon } from "@heroicons/react/24/outline";
import React from "react";
import { DashboardUserNavigation } from "../GenericDashboardWrapper";

import NavbarIdentifier from "./NavbarIdentifier";

import { Link, useNavigate } from "react-router-dom";

import { signOut } from "aws-amplify/auth";
import { URLS } from "../../../src/config/navigation";
import LanguageToggle from "../../LanguageToggle";
import { useTranslation } from "react-i18next";
import { clearUsersCache } from "../../../hooks/useGetAllUsers";

interface Props {
    dashboardUserNavigation: DashboardUserNavigation[];
    setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DashboardNavbar = ({
    dashboardUserNavigation,
    setSidebarOpen,
}: Props) => {

    const {t} = useTranslation();

    const navigate = useNavigate();

    const runSignOut = async () => {
        clearUsersCache();
        await signOut();
        navigate(URLS.root, { replace: true });
    };

    const userControls = (
        <div className="ml-auto flex items-center gap-x-4 lg:pointer-events-auto lg:gap-x-6">
            <LanguageToggle />
            <div
                aria-hidden="true"
                className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200"
            />

            {/* Profile dropdown */}
            <Menu as="div" className="relative">
                <NavbarIdentifier />

                <MenuItems
                    modal={false}
                    transition
                    className="absolute right-0 z-[70] mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                >
                    {dashboardUserNavigation.map((item) => (
                        <MenuItem key={item.name}>
                            <Link
                                to={item.href}
                                className="block px-3 py-1 text-sm/6 text-gray-900 data-focus:bg-gray-50 data-focus:outline-hidden"
                            >
                                {item.name}
                            </Link>
                        </MenuItem>
                    ))}

                    {/* Sign out  */}
                    <MenuItem>
                        <button
                            onClick={() => {
                                runSignOut();
                            }}
                            className="block px-3 text-left w-[100%] py-1 text-sm/6 text-gray-900 data-focus:bg-gray-50 data-focus:outline-hidden"
                        >
                            {t("AuthenticatedView.sign_out")}
                        </button>
                    </MenuItem>
                </MenuItems>
            </Menu>
        </div>
    );

    return (
        <>
            <div className="sticky top-0 z-[60] h-16 shrink-0 lg:pointer-events-none lg:absolute lg:left-0 lg:right-0">
                <div className="flex bg-blue-500 h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-xs sm:gap-x-6 sm:px-6 lg:hidden">
                <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
                >
                    <span className="sr-only">
                        {t("Common.open_sidebar")}
                    </span>
                    <Bars3Icon aria-hidden="true" className="size-6" />
                </button>

                {/* Separator */}
                <div
                    aria-hidden="true"
                    className="h-6 w-px bg-gray-200 lg:hidden"
                />

                <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                    {/* <form
                        action="#"
                        method="GET"
                        className="grid flex-1 grid-cols-1"
                    >
                        <input
                            name="search"
                            type="search"
                            placeholder="Search"
                            aria-label="Search"
                            className="col-start-1 row-start-1 block size-full bg-white pl-8 text-base text-gray-900 outline-hidden placeholder:text-gray-400 sm:text-sm/6"
                        />
                        <MagnifyingGlassIcon
                            aria-hidden="true"
                            className="pointer-events-none col-start-1 row-start-1 size-5 self-center text-gray-400"
                        />
                    </form> */}

                    {userControls}
                </div>
                </div>

                <div className="relative hidden h-16 justify-end lg:flex">
                    <div
                        aria-hidden="true"
                        className="absolute top-0 right-0 h-16 w-[34rem] bg-gray-200 drop-shadow-sm [clip-path:polygon(0_0,100%_0,100%_100%,4rem_100%)]"
                    >
                        <div className="absolute inset-px bg-white [clip-path:polygon(0_0,100%_0,100%_100%,calc(4rem-1px)_100%)]" />
                        <svg
                            aria-hidden="true"
                            className="absolute left-0 top-0 h-16 w-16"
                            viewBox="0 0 64 64"
                        >
                            <line
                                x1="0"
                                y1="0"
                                x2="64"
                                y2="64"
                                stroke="rgb(209 213 219)"
                                strokeWidth="1"
                            />
                        </svg>
                    </div>
                    <div className="relative flex h-16 w-[34rem] items-center justify-end pr-8">
                        {userControls}
                    </div>
                </div>
            </div>
        </>
    );
};

export default DashboardNavbar;
