import { getAvatarSrc } from "../../src/config/AvatarConfig";

import { User } from "../../hooks/interfaces";
import { useCreateVehicle } from "../../contexts/CreateVehicleContext";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import apiClient from "../../services/api-client";

import AdminDeleteUserDialog from "../AdminDeleteUserDialog";
import ErrorBanner from "../ErrorBanner";
import SuccessBanner from "../SuccessBanner";
import ResendInviteDialog from "../ResendInviteDialog";

interface Props {
    user: User;
}

const UserBanner = ({ user }: Props) => {
    const { t } = useTranslation();

    const { openCreateVehicle } = useCreateVehicle();

    const [isDeleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
    const [isResendDialogOpen, setResendDialogOpen] = useState(false);
    const [isResendingInvite, setIsResendingInvite] = useState(false);
    const [resendError, setResendError] = useState<string | null>(null);
    const [resendSuccess, setResendSuccess] = useState(false);

    const needsPasswordChange =
        user.cognito_status === "FORCE_CHANGE_PASSWORD";

    const resendInvite = async () => {
        setIsResendingInvite(true);
        setResendError(null);
        setResendSuccess(false);
        try {
            await apiClient.post(`/api/admin/users/${user.sub}/resend-invite`);
            setResendSuccess(true);
            setResendDialogOpen(false);
        } catch {
            setResendError("AuthenticatedView.Errors.failed_to_resend_invite");
        } finally {
            setIsResendingInvite(false);
        }
    };

    return (
        <>
            <AdminDeleteUserDialog
                sub={user.sub}
                isDeleteUserDialogOpen={isDeleteUserDialogOpen}
                setDeleteUserDialogOpen={setDeleteUserDialogOpen}
            />
            <ResendInviteDialog
                email={user.email}
                isOpen={isResendDialogOpen}
                isLoading={isResendingInvite}
                onClose={() => setResendDialogOpen(false)}
                onConfirm={resendInvite}
            />
            {resendError && (
                <ErrorBanner>{t(resendError)}</ErrorBanner>
            )}
            {resendSuccess && (
                <SuccessBanner onClick={() => setResendSuccess(false)}>
                    {t(
                        "AuthenticatedView.Success.user_invite_resent_successfully"
                    )}
                </SuccessBanner>
            )}

            <div className="bg-white">
                <h2 id="profile-overview-title" className="sr-only">
                    Profile Overview
                </h2>

                <div className="py-4">
                    <div className="sm:flex sm:items-center sm:justify-between">
                        <div className="sm:flex sm:space-x-5">
                            <div className="shrink-0">
                                <img
                                    alt=""
                                    src={getAvatarSrc(
                                        user.email,
                                        needsPasswordChange
                                            ? {
                                                  background: "FEE2E2",
                                                  color: "DC2626",
                                              }
                                            : undefined
                                    )}
                                    className="mx-auto size-20 rounded-full"
                                />
                            </div>
                            <div className="mt-4 text-center sm:mt-0 sm:pt-1 sm:text-left">
                                <p className="text-xl font-bold text-gray-900 sm:text-2xl">
                                    {user.username}
                                </p>
                                <p className="text-sm font-medium text-gray-600">
                                    {user.email}
                                </p>
                                <p className="text-xs font-medium text-gray-600 mt-0.5">
                                    {user.phone_number}
                                </p>
                            </div>
                        </div>
                        <div className="mt-5 flex flex-wrap justify-center gap-2 sm:mt-0">
                            {needsPasswordChange && (
                                <button
                                    onClick={() => setResendDialogOpen(true)}
                                    disabled={isResendingInvite}
                                    className="inline-flex cursor-pointer justify-center rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 shadow-xs hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-75 sm:w-auto"
                                >
                                    {isResendingInvite
                                        ? t("AuthenticatedView.resending")
                                        : t("AuthenticatedView.resend_email")}
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setDeleteUserDialogOpen(true);
                                }}
                                disabled={false}
                                className="inline-flex cursor-pointer justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 disabled:opacity-75 disabled:cursor-not-allowed sm:w-auto"
                            >
                                {t("AuthenticatedView.delete_user")}
                            </button>
                            <button
                                onClick={openCreateVehicle}
                                className="cursor-pointer rounded bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
                            >
                                {t("AuthenticatedView.add_vehicle")}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default UserBanner;
