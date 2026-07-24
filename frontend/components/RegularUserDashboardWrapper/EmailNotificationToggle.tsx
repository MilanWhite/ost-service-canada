import { BellIcon, BellSlashIcon } from "@heroicons/react/24/outline";
import { Switch } from "@headlessui/react";
import { useTranslation } from "react-i18next";

interface Props {
    checked: boolean;
    disabled?: boolean;
    error?: boolean;
    onChange: (checked: boolean) => void;
}

const EmailNotificationToggle = ({ checked, disabled, error, onChange }: Props) => {
    const { t } = useTranslation();
    const Icon = checked ? BellIcon : BellSlashIcon;

    return (
        <div className="-mx-2 border-t border-gray-200 pt-3">
            <Switch
                checked={checked}
                disabled={disabled}
                onChange={onChange}
                className="group flex w-full items-center justify-between gap-x-3 rounded-md px-2 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
            >
                <span className="flex min-w-0 items-center gap-x-2.5">
                    <Icon className="size-5 shrink-0 text-gray-400" />
                    <span className="truncate">
                        {t("AuthenticatedView.email_notifications")}
                    </span>
                </span>
                <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-gray-200"}`}>
                    <span className={`inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                </span>
            </Switch>
            {error && (
                <p className="px-2 pt-1 text-xs text-red-600">
                    {t("AuthenticatedView.Errors.notification_preferences_failed")}
                </p>
            )}
        </div>
    );
};

export default EmailNotificationToggle;
