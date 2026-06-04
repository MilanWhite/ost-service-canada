import { Link } from "react-router-dom";

import { ArrowLeftIcon } from "@heroicons/react/20/solid";

interface Props {
    href: string;
    text?: string;
    compact?: boolean;
}

const BackButton = ({ text, href, compact = false }: Props) => {
    return (
        <>
            <div
                className={
                    compact
                        ? "flex self-stretch items-center"
                        : "flex pb-2 mb-4 sm:mb-6"
                }
            >
                <Link
                    className={`inline-flex items-center font-semibold text-gray-500 hover:text-gray-400 ${
                        compact
                            ? "h-full gap-1 text-md leading-none"
                            : "text-md"
                    }`}
                    to={href}
                >
                    <ArrowLeftIcon className="size-6 shrink-0" />
                    {text && <p className={compact ? "" : "pl-1"}>{text}</p>}
                </Link>
            </div>
        </>
    );
};

export default BackButton;
