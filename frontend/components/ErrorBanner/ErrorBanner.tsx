import { ReactNode, useEffect, useState } from "react";
import { XCircleIcon, XMarkIcon } from "@heroicons/react/20/solid";

interface Props {
    children: ReactNode;
    className?: string;
}

const ErrorBanner = ({ children, className = "mt-5 mb-4" }: Props) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        setIsVisible(true);
    }, [children]);

    if (!isVisible) {
        return null;
    }

    return (
        <div
            className={`dashboard-banner relative z-50 w-full rounded-md bg-red-50 p-4 ${className}`}
        >
            <div className="flex">
                <div className="shrink-0">
                    <XCircleIcon
                        aria-hidden="true"
                        className="size-5 text-red-400"
                    />
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                        {children}
                    </h3>
                </div>
                <div className="ml-auto pl-3">
                    <div className="-mx-1.5 -my-1.5">
                        <button
                            type="button"
                            className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50 focus:outline-hidden"
                            onClick={() => setIsVisible(false)}
                        >
                            <span className="sr-only">Dismiss</span>
                            <XMarkIcon aria-hidden="true" className="size-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ErrorBanner;
