import ActionButton from "../ActionButton";
import AdminCreateUserDialog from "../AdminCreateUserDialog";
import { useCreateUser } from "../../contexts/CreateUserContext";
import SuccessBanner from "../SuccessBanner";
import { useGetAllUsers } from "../../hooks/useGetAllUsers";
import ErrorBanner from "../ErrorBanner";
import { Link, useNavigate } from "react-router-dom";
import { URLS } from "../../src/config/navigation";
import { getAvatarSrc } from "../../src/config/AvatarConfig";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import type { FormEvent } from "react";
import apiClient from "../../services/api-client";
import { User } from "../../hooks/interfaces";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";

import UsersTableSkeleton from "../Skeletons/UsersTableSkeleton";
import ResendInviteDialog from "../ResendInviteDialog";

const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;

const AdminClientList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [resendingSub, setResendingSub] = useState<string | null>(null);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [resendError, setResendError] = useState<string | null>(null);
    const [resendUser, setResendUser] = useState<User | null>(null);
    const [vinSearch, setVinSearch] = useState("");
    const [vinSearchError, setVinSearchError] = useState<string | null>(null);
    const [vinSearchLoading, setVinSearchLoading] = useState(false);

    const { openCreateUser, showCreateUserSuccess, setShowCreateUserSuccess } =
        useCreateUser();

    const {
        allUsers,
        getAllUsersLoading,
        getAllUsersError,
        getAllUsersRefetch,
    } = useGetAllUsers();

    const resendInvite = async (sub: string) => {
        setResendingSub(sub);
        setResendError(null);
        setResendSuccess(false);
        try {
            await apiClient.post(`/api/admin/users/${sub}/resend-invite`);
            setResendSuccess(true);
            setResendUser(null);
        } catch {
            setResendError("AuthenticatedView.Errors.failed_to_resend_invite");
        } finally {
            setResendingSub(null);
        }
    };

    const searchByVin = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const normalizedVin = vinSearch.trim().toUpperCase();
        setVinSearch(normalizedVin);

        if (!vinPattern.test(normalizedVin)) {
            setVinSearchError("AuthenticatedView.Errors.invalid_vin");
            return;
        }

        setVinSearchLoading(true);
        setVinSearchError(null);
        try {
            const response = await apiClient.get<{
                message: {
                    vehicle: {
                        id: number;
                        cognito_sub: string;
                    };
                };
            }>("/api/admin/vehicles/search-by-vin", {
                params: { vin: normalizedVin },
            });

            const { vehicle } = response.data.message;
            navigate(
                URLS.adminViewClientSingularVehicle(
                    vehicle.cognito_sub,
                    String(vehicle.id)
                )
            );
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } }).response
                ?.status;
            setVinSearchError(
                status === 404
                    ? "AuthenticatedView.Errors.vehicle_vin_not_found"
                    : "AuthenticatedView.Errors.failed_to_load_vehicle"
            );
        } finally {
            setVinSearchLoading(false);
        }
    };

    return (
        <>
            {getAllUsersError && (
                <ErrorBanner>{t(getAllUsersError as string)}</ErrorBanner>
            )}
            {resendError && <ErrorBanner>{t(resendError)}</ErrorBanner>}
            {vinSearchError && (
                <ErrorBanner>{t(vinSearchError)}</ErrorBanner>
            )}
            {showCreateUserSuccess && (
                <SuccessBanner
                    onClick={() => {
                        setShowCreateUserSuccess(false);
                    }}
                >
                    {t(
                        "AuthenticatedView.Success.user_invite_sent_successfully"
                    )}
                </SuccessBanner>
            )}
            {resendSuccess && (
                <SuccessBanner onClick={() => setResendSuccess(false)}>
                    {t(
                        "AuthenticatedView.Success.user_invite_resent_successfully"
                    )}
                </SuccessBanner>
            )}
            <ResendInviteDialog
                email={resendUser?.email ?? ""}
                isOpen={resendUser !== null}
                isLoading={resendingSub !== null}
                onClose={() => setResendUser(null)}
                onConfirm={() => {
                    if (resendUser) {
                        resendInvite(resendUser.sub);
                    }
                }}
            />
            <AdminCreateUserDialog getAllUsersRefetch={getAllUsersRefetch} />
            <div>
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="sm:flex sm:items-center">
                        <div className="sm:flex-auto">
                            <h1 className="text-base font-semibold text-gray-900">
                                {t("AuthenticatedView.client_list")}
                            </h1>
                            <p className="mt-2 text-sm text-gray-700">
                                {t(
                                    "AuthenticatedView.clients_signed_up_description"
                                )}
                            </p>
                        </div>
                        <div className="mt-4 flex flex-col gap-3 sm:mt-0 sm:ml-16 sm:flex-none sm:flex-row sm:items-end">
                            <form
                                className="w-full sm:w-50"
                                onSubmit={searchByVin}
                            >
                                <div className="mt-2">
                                    <div className="flex rounded-md bg-white outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-primary">
                                        <input
                                            id="global-vin-search"
                                            name="global-vin-search"
                                            type="text"
                                            value={vinSearch}
                                            aria-label={t(
                                                "AuthenticatedView.vin"
                                            )}
                                            placeholder={t(
                                                "AuthenticatedView.vin"
                                            )}
                                            autoComplete="off"
                                            maxLength={17}
                                            className="block min-w-0 w-full grow px-3 py-1.5 text-base text-gray-900 uppercase placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                                            onChange={(event) => {
                                                setVinSearch(
                                                    event.currentTarget.value.toUpperCase()
                                                );
                                                setVinSearchError(null);
                                            }}
                                        />
                                        <div className="flex py-1.5 pr-1.5">
                                            <button
                                                type="submit"
                                                disabled={vinSearchLoading}
                                                className="disabled:cursor-not-allowed"
                                            >
                                                <span className="sr-only">
                                                    {t(
                                                        "AuthenticatedView.search"
                                                    )}
                                                </span>
                                                <MagnifyingGlassIcon className="cursor-pointer w-4.5 text-gray-500 hover:text-gray-400" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                            <ActionButton onClick={openCreateUser}>
                                {t("AuthenticatedView.invite_user")}
                            </ActionButton>
                        </div>
                    </div>
                </div>
                <div className="mt-8 flow-root overflow-hidden">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <table className="w-full text-left">
                            <thead className="bg-white">
                                <tr>
                                    <th
                                        scope="col"
                                        className="relative isolate py-3.5 pr-3 text-left text-sm font-semibold text-gray-900"
                                    >
                                        {t("AuthenticatedView.client")}
                                        <div className="absolute inset-y-0 right-full -z-10 w-screen border-b border-b-gray-200" />
                                        <div className="absolute inset-y-0 left-0 -z-10 w-screen border-b border-b-gray-200" />
                                    </th>
                                    <th
                                        scope="col"
                                        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 md:table-cell"
                                    >
                                        {t("AuthenticatedView.phone_number")}
                                    </th>

                                    <th
                                        scope="col"
                                        className="relative py-3.5 pl-3"
                                    >
                                        <span className="sr-only">
                                            {t("AuthenticatedView.view")}
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {!getAllUsersLoading ? (
                                    allUsers.map((user) => {
                                        const needsPasswordChange =
                                            user.cognito_status ===
                                            "FORCE_CHANGE_PASSWORD";

                                        return (
                                            <tr key={user.sub}>
                                                <td className="py-5 pr-3 text-sm whitespace-nowrap sm:pl-0">
                                                    <div className="flex items-center">
                                                        <div className="size-11 shrink-0">
                                                            <img
                                                                alt=""
                                                                src={getAvatarSrc(
                                                                    user.email,
                                                                    needsPasswordChange
                                                                        ? {
                                                                              background:
                                                                                  "FEE2E2",
                                                                              color: "DC2626",
                                                                          }
                                                                        : undefined
                                                                )}
                                                                className="size-11 rounded-full"
                                                            />
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="font-medium text-gray-900">
                                                                {user.username}
                                                            </div>
                                                            <div className="mt-1 text-gray-500">
                                                                {user.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="hidden px-3 py-4 text-sm text-gray-500 md:table-cell">
                                                    {user.phone_number}
                                                </td>

                                                <td className="relative py-4 pl-3 text-right text-sm font-medium">
                                                    <div className="flex justify-end gap-x-4">
                                                        {needsPasswordChange && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setResendUser(
                                                                        user
                                                                    )
                                                                }
                                                                disabled={
                                                                    resendingSub ===
                                                                    user.sub
                                                                }
                                                                className="hidden text-red-600 hover:text-red-500 disabled:cursor-not-allowed disabled:text-gray-400 md:inline"
                                                            >
                                                                {resendingSub ===
                                                                user.sub
                                                                    ? t(
                                                                          "AuthenticatedView.resending"
                                                                      )
                                                                    : t(
                                                                          "AuthenticatedView.resend_email"
                                                                      )}
                                                            </button>
                                                        )}
                                                        <Link
                                                            to={URLS.adminViewClientVehicles(
                                                                user.sub
                                                            )}
                                                            className="text-primary hover:text-primary-hover"
                                                        >
                                                            {t(
                                                                "AuthenticatedView.view"
                                                            )}
                                                            <span className="sr-only">
                                                                , {user.username}
                                                            </span>
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <UsersTableSkeleton />
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminClientList;
