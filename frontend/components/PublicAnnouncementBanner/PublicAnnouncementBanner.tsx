import { useTranslation } from "react-i18next";
import { XMarkIcon } from "@heroicons/react/20/solid";

import { URLS } from "../../src/config/navigation";

interface PublicAnnouncementBannerProps {
    onDismiss: () => void;
}

const PublicAnnouncementBanner = ({
    onDismiss,
}: PublicAnnouncementBannerProps) => {
    const { t } = useTranslation();

    return (
        <div className="relative flex items-center gap-x-6 bg-primary/75 px-6 py-2.5 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-white/10 sm:px-3.5 sm:before:flex-1">
            <p className="text-sm/6 text-white">
                <a
                    href={URLS.georgiaSite}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <strong className="font-semibold">
                        {t("Announcement.georgia_LLC")}
                    </strong>
                    <svg
                        viewBox="0 0 2 2"
                        aria-hidden="true"
                        className="mx-2 inline size-0.5 fill-current"
                    >
                        <circle r={1} cx={1} cy={1} />
                    </svg>
                    {t("Announcement.georgia_open")}&nbsp;
                    <span aria-hidden="true">&rarr;</span>
                </a>
            </p>
            <div className="flex flex-1 justify-end">
                <button
                    type="button"
                    className="-m-3 p-3 focus-visible:-outline-offset-4"
                    onClick={onDismiss}
                >
                    <span className="sr-only ">
                        {t("Announcement.georgia_banner_dismiss")}
                    </span>
                    <XMarkIcon
                        aria-hidden="true"
                        className="size-5 text-white cursor-pointer"
                    />
                </button>
            </div>
        </div>
    );
};

export default PublicAnnouncementBanner;
