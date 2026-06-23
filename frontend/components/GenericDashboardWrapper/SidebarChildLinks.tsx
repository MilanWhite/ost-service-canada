import { Link } from "react-router-dom";
import { DashboardNavigationChild } from "./GenericDashboardWrapper";

interface Props {
    childrenLinks: DashboardNavigationChild[];
    onNavigate?: () => void;
}

function classNames(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

const SidebarChildLinks = ({ childrenLinks, onNavigate }: Props) => {
    if (childrenLinks.length === 0) return null;

    return (
        <ul className="mt-2 space-y-1 border-l border-gray-200 pl-3">
            {childrenLinks.map((child) => (
                <li key={child.href}>
                    <Link
                        to={child.href}
                        onClick={onNavigate}
                        className={classNames(
                            child.current
                                ? "bg-gray-50 text-primary"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                            "group flex min-w-0 items-center gap-x-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors"
                        )}
                    >
                        {child.imageSrc && (
                            <img
                                alt=""
                                src={child.imageSrc}
                                className="size-7 shrink-0 rounded-full"
                            />
                        )}
                        <span className="min-w-0 flex-1">
                            <span className="block truncate">{child.name}</span>
                            {child.label && (
                                <span
                                    className={classNames(
                                        child.current
                                            ? "text-primary"
                                            : "text-gray-400",
                                        "block truncate text-xs font-normal"
                                    )}
                                >
                                    {child.label}
                                </span>
                            )}
                        </span>
                    </Link>
                </li>
            ))}
        </ul>
    );
};

export default SidebarChildLinks;
