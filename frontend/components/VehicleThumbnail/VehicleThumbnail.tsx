import noImagePlaceholder from "../../src/assets/images/no-image-placeholder.svg";

interface Props {
    mobileSrc: string;
    desktopSrc: string;
    alt?: string;
    className?: string;
    fallbackSrc?: string;
    hideMobileFallback?: boolean;
}

const VehicleThumbnail = ({
    mobileSrc,
    desktopSrc,
    alt = "",
    className = "",
    fallbackSrc = "",
    hideMobileFallback = false,
}: Props) => {
    const hasMobileImage = Boolean(mobileSrc || desktopSrc);
    const isSameSrc = (currentSrc: string, nextSrc: string) =>
        currentSrc === new URL(nextSrc, window.location.href).href;

    const handleError = (
        event: React.SyntheticEvent<HTMLImageElement, Event>,
        alternateSrc?: string,
        hideFallbackOnError = false
    ) => {
        const img = event.currentTarget;

        if (alternateSrc && !isSameSrc(img.src, alternateSrc)) {
            img.src = alternateSrc;
            return;
        }

        if (fallbackSrc && !isSameSrc(img.src, fallbackSrc)) {
            img.src = fallbackSrc;
            return;
        }

        if (hideFallbackOnError) {
            img.style.display = "none";
            return;
        }

        if (!isSameSrc(img.src, noImagePlaceholder)) {
            img.src = noImagePlaceholder;
            return;
        }

        img.style.display = "none";
    };

    return (
        <>
            {(!hideMobileFallback || hasMobileImage) && (
                <img
                    src={mobileSrc || desktopSrc || noImagePlaceholder}
                    alt={alt}
                    className={`block sm:hidden ${className}`}
                    onError={(event) =>
                        handleError(
                            event,
                            desktopSrc || undefined,
                            hideMobileFallback
                        )
                    }
                />
            )}

            <img
                src={desktopSrc || mobileSrc || noImagePlaceholder}
                alt={alt}
                className={`hidden sm:block ${className}`}
                onError={(event) =>
                    handleError(event, mobileSrc || undefined)
                }
            />
        </>
    );
};

export default VehicleThumbnail;
