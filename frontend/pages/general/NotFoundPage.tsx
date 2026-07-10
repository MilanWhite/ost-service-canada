import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function NotFoundPage() {
    const { t } = useTranslation();

    return (
            <div className="h-[90dvh]">
                <main className="grid min-h-full place-items-center">
                    <div className="text-center">
                        <p className="text-base font-semibold text-primary">
                            404
                        </p>
                        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-7xl">
                            {t("NotFoundPage.title")}
                        </h1>
                        <p className="mt-6 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8">
                            {t("NotFoundPage.description")}
                        </p>
                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <Link
                                to="/"
                                className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            >
                                {t("NotFoundPage.go_home")}
                            </Link>
                        </div>
                    </div>
                </main>
            </div>
    );
}
