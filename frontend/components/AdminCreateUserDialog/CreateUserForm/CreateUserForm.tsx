import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import useCreateUserForm, {
    CreateUserInfo,
} from "../../../hooks/useCreateUserForm";

import ErrorBanner from "../../ErrorBanner";
import ErrorText from "../../ErrorText";

import { useCreateUser } from "../../../contexts/CreateUserContext";
import { useTranslation } from "react-i18next";

const passwordSchema = z.string().superRefine((password, ctx) => {
    if (!password) return;

    if (password.length < 8) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Auth.error_password_min_chars",
        });
    }
    if (!/[0-9]/.test(password)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Auth.error_password_number",
        });
    }
    if (!/[A-Z]/.test(password)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Auth.error_password_uppercase",
        });
    }
    if (!/[a-z]/.test(password)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Auth.error_password_lowercase",
        });
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Auth.error_password_special_char",
        });
    }
});

const schema = z.object({
    username: z
        .string()
        .trim()
        .min(1, { message: "AuthenticatedView.Errors.username_required" }),
    email: z
        .string()
        .trim()
        .email({ message: "AuthenticatedView.Errors.invalid_email_address" }),
    phoneNumber: z.string().trim(),
    password: passwordSchema,
});

type FormData = z.infer<typeof schema>;

interface Props {
    getAllUsersRefetch: () => void;
}

const CreateUserForm = ({ getAllUsersRefetch }: Props) => {
    const { t } = useTranslation();

    const { createUser, isCreateUserLoading, createUserError } =
        useCreateUserForm(); // hook

    const { closeCreateUser } = useCreateUser(); // context

    const onSubmit = async (data: FormData) => {
        const createUserInfo: CreateUserInfo = {
            username: data.username,
            email: data.email,
            phoneNumber: data.phoneNumber,
            password: data.password || undefined,
        };
        await createUser(createUserInfo, getAllUsersRefetch);
    };

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            password: "",
        },
    });

    const password = watch("password", "");
    const isPasswordMode = password.length > 0;
    const lengthValid = password.length >= 8;
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    return (
        <>
            <form
                action="#"
                method="POST"
                className="relative px-6 py-6 lg:px-8 lg:pb-12"
                onSubmit={handleSubmit(onSubmit)}
            >
                {createUserError && (
                    <ErrorBanner>{t(createUserError as string)}</ErrorBanner>
                )}

                <div className="mx-auto max-w-xl lg:mr-0 lg:max-w-lg pb-4">
                    <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label
                                htmlFor="username"
                                className="block text-sm/6 font-semibold text-gray-900"
                            >
                                {t("AuthenticatedView.company_name_name")}
                            </label>
                            <div className="mt-2.5">
                                <input
                                    id="username"
                                    type="username"
                                    autoComplete="username"
                                    className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                                    {...register("username")}
                                />
                                <ErrorText>
                                    {errors.username &&
                                        t(errors.username.message as string)}
                                </ErrorText>
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label
                                htmlFor="email"
                                className="block text-sm/6 font-semibold text-gray-900"
                            >
                                {t("AuthenticatedView.email")}
                            </label>
                            <div className="mt-2.5">
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                                    {...register("email")}
                                />
                                <ErrorText>
                                    {errors.email &&
                                        t(errors.email.message as string)}
                                </ErrorText>
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label
                                htmlFor="phoneNumber"
                                className="block text-sm/6 font-semibold text-gray-900"
                            >
                                {t("AuthenticatedView.phone_number")}
                            </label>
                            <div className="mt-2.5">
                                <input
                                    id="phoneNumber"
                                    type="phoneNumber"
                                    autoComplete="phoneNumber"
                                    className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                                    {...register("phoneNumber")}
                                />
                            </div>
                        </div>

                        <details className="sm:col-span-2 mt-3 rounded-md border bg-gray-50 border-gray-200 px-3.5 py-3">
                            <summary className="cursor-pointer text-sm font-semibold text-gray-900">
                                {t("AuthenticatedView.set_permanent_password")}
                            </summary>
                            <div className="mt-3">
                                <label
                                    htmlFor="password"
                                    className="block text-sm/6 font-semibold text-gray-900"
                                >
                                    {t("Auth.new_password_label")}
                                </label>
                                <div className="mt-2.5">
                                    <input
                                        id="password"
                                        type="password"
                                        autoComplete="new-password"
                                        className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                                        {...register("password")}
                                    />
                                    <div className="mt-2 space-y-1 text-xs">
                                        <p
                                            className={
                                                lengthValid
                                                    ? "text-green-600"
                                                    : "text-gray-500"
                                            }
                                        >
                                            &bull; {t("Auth.password_min_chars")}
                                        </p>
                                        <p
                                            className={
                                                hasLowercase
                                                    ? "text-green-600"
                                                    : "text-gray-500"
                                            }
                                        >
                                            &bull; {t("Auth.password_lowercase")}
                                        </p>
                                        <p
                                            className={
                                                hasUppercase
                                                    ? "text-green-600"
                                                    : "text-gray-500"
                                            }
                                        >
                                            &bull; {t("Auth.password_uppercase")}
                                        </p>
                                        <p
                                            className={
                                                hasNumber
                                                    ? "text-green-600"
                                                    : "text-gray-500"
                                            }
                                        >
                                            &bull; {t("Auth.password_number")}
                                        </p>
                                        <p
                                            className={
                                                hasSpecial
                                                    ? "text-green-600"
                                                    : "text-gray-500"
                                            }
                                        >
                                            &bull; {t("Auth.password_special_char")}
                                        </p>
                                    </div>
                                    <ErrorText>
                                        {errors.password &&
                                            t(errors.password.message as string)}
                                    </ErrorText>
                                </div>
                            </div>
                        </details>
                    </div>
                </div>

                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                        type="submit"
                        onClick={() => {}}
                        disabled={isCreateUserLoading}
                        className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary-hover disabled:opacity-75 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                    >
                        {isCreateUserLoading
                            ? isPasswordMode
                                ? t("AuthenticatedView.creating_loading")
                                : t("AuthenticatedView.inviting_loading")
                            : isPasswordMode
                              ? t("AuthenticatedView.create_user")
                              : t("AuthenticatedView.invite_user")}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            closeCreateUser();
                        }}
                        disabled={isCreateUserLoading}
                        className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:opacity-75 disabled:cursor-not-allowed sm:mt-0 sm:w-auto mt-3"
                    >
                        {t("AuthenticatedView.cancel")}
                    </button>
                </div>
            </form>
        </>
    );
};

export default CreateUserForm;
