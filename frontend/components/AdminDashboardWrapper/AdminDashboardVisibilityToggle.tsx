import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { Switch } from "@headlessui/react";
import { useTranslation } from "react-i18next";

interface Props {
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const AdminDashboardVisibilityToggle = ({ checked, onChange }: Props) => {
    const { t } = useTranslation();
    const Icon = checked ? EyeIcon : EyeSlashIcon;

    return (
        <div className="-mx-2 border-t border-gray-200 pt-3">
            <Switch
                checked={checked}
                onChange={onChange}
                className="group flex w-full items-center justify-between gap-x-3 rounded-md px-2 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
                <span className="flex min-w-0 items-center gap-x-2.5">
                    <Icon
                        aria-hidden="true"
                        className="size-5 shrink-0 text-gray-400 group-hover:text-primary-hover"
                    />
                    <span className="truncate">
                        {t("AuthenticatedView.dashboard")}
                    </span>
                </span>
                <span
                    aria-hidden="true"
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                        checked ? "bg-primary" : "bg-gray-200"
                    }`}
                >
                    <span
                        className={`inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${
                            checked ? "translate-x-[18px]" : "translate-x-0.5"
                        }`}
                    />
                </span>
            </Switch>
        </div>
    );
};

export default AdminDashboardVisibilityToggle;
