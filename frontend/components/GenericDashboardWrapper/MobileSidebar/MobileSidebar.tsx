import React, { ReactNode } from "react";
import { DashboardNavigation } from "../GenericDashboardWrapper";
import Logo from "../../Logo";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    TransitionChild,
} from "@headlessui/react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SidebarChildLinks from "../SidebarChildLinks";

interface Props {
    dashboardNavigation: DashboardNavigation[];
    homeURL: string;
    sidebarFooter?: ReactNode;
    sidebarOpen: boolean;
    setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

function classNames(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

const MobileSidebar = ({
    dashboardNavigation,
    homeURL,
    sidebarFooter,
    sidebarOpen,
    setSidebarOpen,
}: Props) => {
    const { t } = useTranslation();

    return (
        <>
            <Dialog
                open={sidebarOpen}
                onClose={setSidebarOpen}
                className="relative z-50 lg:hidden"
            >
                <DialogBackdrop
                    transition
                    className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
                />

                <div className="fixed inset-0 flex">
                    <DialogPanel
                        transition
                        className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
                    >
                        <TransitionChild>
                            <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                                <button
                                    type="button"
                                    onClick={() => setSidebarOpen(false)}
                                    className="-m-2.5 p-2.5"
                                >
                                    <span className="sr-only">
                                        Close sidebar
                                    </span>
                                    <XMarkIcon
                                        aria-hidden="true"
                                        className="size-6 text-white"
                                    />
                                </button>
                            </div>
                        </TransitionChild>
                        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                            <div className="flex h-20 shrink-0 items-center">
                                <Logo height={50} to={homeURL} />
                            </div>

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
                                                            setSidebarOpen(
                                                                false
                                                            )
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
                                                                setSidebarOpen(
                                                                    false
                                                                )
                                                            }
                                                        />
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                    {sidebarFooter && (
                                        <li className="mt-auto">
                                            {sidebarFooter}
                                        </li>
                                    )}
                                </ul>
                            </nav>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
};

export default MobileSidebar;
