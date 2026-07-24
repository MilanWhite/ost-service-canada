import { useEffect, useState } from "react";
import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    DialogTitle,
} from "@headlessui/react";
import { CheckIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

const sendEmailDefault =
    (import.meta.env.VITE_ADMIN_SEND_EMAIL_DEFAULT ?? "true").toLowerCase() ===
    "true";

export interface VehicleNotificationOptions {
    sendNotification: boolean;
    hasKeys?: boolean;
}

interface Props {
    isOpen: boolean;
    isLoading: boolean;
    deliveryTriggered: boolean;
    billOfLadingTriggered: boolean;
    notificationsEnabled: boolean;
    onClose: () => void;
    onConfirm: (options: VehicleNotificationOptions) => void;
}

const VehicleNotificationDialog = ({
    isOpen,
    isLoading,
    deliveryTriggered,
    billOfLadingTriggered,
    notificationsEnabled,
    onClose,
    onConfirm,
}: Props) => {
    const { t } = useTranslation();
    const [sendNotification, setSendNotification] = useState(true);
    const [hasKeys, setHasKeys] = useState<boolean | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSendNotification(notificationsEnabled && sendEmailDefault);
            setHasKeys(true);
        }
    }, [isOpen, notificationsEnabled]);

    const titleKey = deliveryTriggered && billOfLadingTriggered
        ? "AuthenticatedView.notification_dialog_combined_title"
        : deliveryTriggered
          ? "AuthenticatedView.notification_dialog_delivery_title"
          : "AuthenticatedView.notification_dialog_bol_title";

    return (
        <Dialog open={isOpen} onClose={isLoading ? () => undefined : onClose} className="relative z-60">
            <DialogBackdrop className="fixed inset-0 bg-gray-500/75" />
            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
                    <DialogPanel className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                        <div className="flex items-start gap-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-100">
                                <EnvelopeIcon className="size-6 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <DialogTitle className="text-base font-semibold text-gray-900">
                                    {t(titleKey)}
                                </DialogTitle>
                                {billOfLadingTriggered && (
                                    <p className="mt-2 text-sm text-gray-600">
                                        {t("AuthenticatedView.notification_dialog_bol_description")}
                                    </p>
                                )}

                                {deliveryTriggered && (
                                    <fieldset className="mt-5">
                                        <legend className="text-sm font-semibold text-gray-900">
                                            {t("AuthenticatedView.vehicle_has_keys_question")}
                                        </legend>
                                        <div className="mt-3 flex items-center gap-8">
                                            {[true, false].map((value) => (
                                                <div
                                                    key={String(value)}
                                                    className="flex items-center"
                                                >
                                                    <input
                                                        id={`vehicle-has-keys-${value ? "yes" : "no"}`}
                                                        type="radio"
                                                        name="vehicle-has-keys"
                                                        checked={hasKeys === value}
                                                        onChange={() => setHasKeys(value)}
                                                        disabled={isLoading}
                                                        className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:border-gray-200 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden"
                                                    />
                                                    <label
                                                        htmlFor={`vehicle-has-keys-${value ? "yes" : "no"}`}
                                                        className="ml-3 block text-sm font-medium text-gray-700"
                                                    >
                                                        {t(value ? "Common.yes" : "Common.no")}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </fieldset>
                                )}

                            </div>
                        </div>
                        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="sm:mr-auto">
                                <label
                                    className={`flex items-center gap-2 ${notificationsEnabled && !isLoading ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                                >
                                    <span className="group grid size-5 shrink-0 grid-cols-1">
                                        <input
                                            type="checkbox"
                                            checked={sendNotification}
                                            onChange={(event) => setSendNotification(event.target.checked)}
                                            disabled={!notificationsEnabled || isLoading}
                                            className="col-start-1 row-start-1 appearance-none rounded border border-gray-400 bg-white checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:border-gray-300 disabled:bg-gray-100"
                                        />
                                        <CheckIcon
                                            aria-hidden="true"
                                            className="pointer-events-none col-start-1 row-start-1 size-4 self-center justify-self-center stroke-[3] text-white opacity-0 group-has-checked:opacity-100"
                                        />
                                    </span>
                                    <span className="text-sm font-medium text-gray-700">
                                        {t("AuthenticatedView.send_vehicle_notification")}
                                    </span>
                                </label>
                                {!notificationsEnabled && (
                                    <p className="mt-1 text-xs font-medium text-amber-700">
                                        {t("AuthenticatedView.client_notifications_disabled")}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-col-reverse gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-gray-300 ring-inset disabled:opacity-75"
                                >
                                    {t("AuthenticatedView.cancel")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onConfirm({
                                        sendNotification,
                                        ...(deliveryTriggered && hasKeys !== null ? { hasKeys } : {}),
                                    })}
                                    disabled={isLoading || (deliveryTriggered && hasKeys === null)}
                                    className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isLoading
                                        ? t("AuthenticatedView.saving")
                                        : t("AuthenticatedView.confirm_and_save")}
                                </button>
                            </div>
                        </div>
                    </DialogPanel>
                </div>
            </div>
        </Dialog>
    );
};

export default VehicleNotificationDialog;
