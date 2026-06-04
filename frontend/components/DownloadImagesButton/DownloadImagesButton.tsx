import { useState } from "react";
import JSZip from "jszip";
import { ArrowDownTrayIcon } from "@heroicons/react/20/solid";
import { useTranslation } from "react-i18next";

interface Props {
    images: string[];
    vehicleName: string;
}

const getFilenameFromUrl = (url: string, index: number, contentType: string) => {
    let filename = `image-${index + 1}`;

    try {
        const parsed = new URL(url);
        filename =
            decodeURIComponent(parsed.pathname.split("/").pop() ?? "") ||
            filename;
    } catch {
        filename = decodeURIComponent(url.split("?")[0].split("/").pop() ?? "") || filename;
    }

    if (!filename.includes(".")) {
        const extension = contentType.split("/")[1];
        if (extension) {
            filename = `${filename}.${extension === "jpeg" ? "jpg" : extension}`;
        }
    }

    return filename.replace(/[\\/:*?"<>|]/g, "_");
};

const getZipFilename = (vehicleName: string) => {
    const fallback = "vehicle-images";
    const safeName = (vehicleName || fallback)
        .trim()
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/\s+/g, "-");

    return `${safeName || fallback}-images.zip`;
};

const DownloadImagesButton = ({ images, vehicleName }: Props) => {
    const { t } = useTranslation();
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDownload = async () => {
        if (images.length === 0 || isDownloading) return;

        setIsDownloading(true);
        setError(null);

        try {
            const zip = new JSZip();
            const usedFilenames = new Set<string>();

            for (const [index, imageUrl] of images.entries()) {
                const response = await fetch(imageUrl);

                if (!response.ok) {
                    throw new Error("Failed to fetch image");
                }

                const blob = await response.blob();
                const contentType = blob.type || response.headers.get("content-type") || "";
                const baseFilename = getFilenameFromUrl(imageUrl, index, contentType);
                const dotIndex = baseFilename.lastIndexOf(".");
                const stem =
                    dotIndex > 0 ? baseFilename.slice(0, dotIndex) : baseFilename;
                const extension =
                    dotIndex > 0 ? baseFilename.slice(dotIndex) : "";
                let filename = baseFilename;
                let duplicateIndex = 2;

                while (usedFilenames.has(filename)) {
                    filename = `${stem}-${duplicateIndex}${extension}`;
                    duplicateIndex += 1;
                }

                usedFilenames.add(filename);
                zip.file(filename, blob);
            }

            const zipBlob = await zip.generateAsync({ type: "blob" });
            const downloadUrl = URL.createObjectURL(zipBlob);
            const link = document.createElement("a");

            link.href = downloadUrl;
            link.download = getZipFilename(vehicleName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(downloadUrl);
        } catch {
            setError(
                t("AuthenticatedView.Errors.failed_to_download_images", {
                    defaultValue: "Failed to download images",
                })
            );
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex flex-col items-start gap-1">
            <button
                type="button"
                onClick={handleDownload}
                disabled={images.length === 0 || isDownloading}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
                <ArrowDownTrayIcon className="size-4" />
                {isDownloading
                    ? t("AuthenticatedView.downloading", {
                          defaultValue: "Downloading",
                      })
                    : t("AuthenticatedView.download_images", {
                          defaultValue: "Download images",
                      })}
            </button>
            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        </div>
    );
};

export default DownloadImagesButton;
