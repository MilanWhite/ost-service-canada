import { useTranslation } from "react-i18next";
import TbilisiSkylineImage from "../../src/assets/images/tbilisi_skyline.webp";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

const GeorgiaSection = () => {
    const { t } = useTranslation();

    return (
        <div className="overflow-hidden bg-gray-100 py-12">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-12 sm:gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:items-center">
                    <div className="lg:pr-4">
                        <div className="max-w-xl">
                            <p className="mt-2 text-4xl font-semibold tracking-tight text-pretty text-gray-900 sm:text-5xl">
                                {t("HomePage.georgia_title")}
                            </p>
                            <p className="mt-4 max-w-2xl text-gray-600 lg:text-lg">
                                {t("HomePage.georgia_text")}
                            </p>
                            <div className="mt-6">
                                <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap">
                                    <a
                                        href="https://ostservicecanada.ge/"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-x-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-primary-hover"
                                    >
                                        {t("HomePage.georgia_visit_site")}
                                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="hidden w-full lg:block">
                        <img
                            alt="Product screenshot"
                            src={TbilisiSkylineImage}
                            className="h-auto max-h-[300px] w-full rounded-xl object-cover shadow-xl ring-1 ring-gray-400/10"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeorgiaSection;
