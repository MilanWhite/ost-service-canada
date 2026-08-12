import { useEffect, useState, type MouseEvent, type WheelEvent } from "react";

interface ImageItem {
    id?: number;
    filename?: string;
    original: string;
    mobile?: string;
    thumbnail?: string;
}

interface Props {
    images: string[];
    imageItems?: ImageItem[];
    videos: string[];
}

import { Dialog, DialogBackdrop } from "@headlessui/react";
import {
    ArrowPathIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

const ImageCarousel = ({ images, imageItems, videos }: Props) => {
    const { t } = useTranslation();
    const isEnhancedViewer =
        import.meta.env.VITE_IMAGE_VIEWER_VARIANT !== "bare";

    const [isCarouselFullscreen, setIsCarouselFullscreen] = useState(false);

    const carouselImages =
        imageItems && imageItems.length > 0
            ? imageItems.map((item) => ({
                  src: item.original,
                  mobileSrc: item.mobile || item.original,
                  thumbnailSrc: item.thumbnail || item.mobile || item.original,
                  filename: item.filename,
              }))
            : images.map((image) => ({
                  src: image,
                  mobileSrc: image,
                  thumbnailSrc: image,
                  filename: undefined,
              }));

    const total = carouselImages.length + videos.length;
    const [currentIndex, setCurrentIndex] = useState(0);
    const [rotations, setRotations] = useState<Record<number, number>>({});
    const rotation = rotations[currentIndex] ?? 0;
    const isQuarterTurn = rotation % 180 !== 0;
    const prevImage = () => setCurrentIndex((i) => (i - 1 + total) % total);
    const nextImage = () => setCurrentIndex((i) => (i + 1) % total);
    const rotateImage = () =>
        setRotations((current) => ({
            ...current,
            [currentIndex]: ((current[currentIndex] ?? 0) + 90) % 360,
        }));

    useEffect(() => {
        if (currentIndex >= total) {
            setCurrentIndex(0);
        }

    }, [currentIndex, total]);

    if (total === 0) {
        return (
            <div className="text-center text-gray-500">
                {t("AuthenticatedView.Errors.no_images_available")}
            </div>
        );
    }

    const isVideo = currentIndex >= carouselImages.length;
    const currentImage = isVideo ? null : carouselImages[currentIndex];
    const src = isVideo
        ? videos[currentIndex - carouselImages.length]
        : currentImage?.src ?? "";
    const mediaItems = [
        ...carouselImages.map((image) => ({
            type: "image" as const,
            src: image.src,
            mobileSrc: image.mobileSrc,
            thumbnailSrc: image.thumbnailSrc,
            filename: image.filename,
        })),
        ...videos.map((video) => ({ type: "video" as const, src: video })),
    ];

    const handleThumbnailWheel = (event: WheelEvent<HTMLDivElement>) => {
        const scroller = event.currentTarget;
        const hasHorizontalOverflow =
            scroller.scrollWidth > scroller.clientWidth;

        if (!hasHorizontalOverflow) return;

        const delta =
            Math.abs(event.deltaX) > Math.abs(event.deltaY)
                ? event.deltaX
                : event.deltaY;

        if (delta === 0) return;

        scroller.scrollLeft += delta;
        event.preventDefault();
    };

    const closeFullscreen = () => {
        setIsCarouselFullscreen(false);
        setRotations({});
    };

    const stopFullscreenClose = (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
    };

    const handleFullscreenImageClick = (event: MouseEvent<HTMLImageElement>) => {
        const image = event.currentTarget;
        const imageRatio = image.naturalWidth / image.naturalHeight;
        const containerRatio = image.clientWidth / image.clientHeight;

        const renderedWidth =
            imageRatio > containerRatio
                ? image.clientWidth
                : image.clientHeight * imageRatio;
        const renderedHeight =
            imageRatio > containerRatio
                ? image.clientWidth / imageRatio
                : image.clientHeight;
        const left = (image.clientWidth - renderedWidth) / 2;
        const top = (image.clientHeight - renderedHeight) / 2;
        const { offsetX, offsetY } = event.nativeEvent;

        if (
            offsetX >= left &&
            offsetX <= left + renderedWidth &&
            offsetY >= top &&
            offsetY <= top + renderedHeight
        ) {
            event.stopPropagation();
        }
    };

    const renderThumbnails = (isFullscreen = false) => (
        <div
            className="w-full max-w-full min-w-0 overflow-hidden"
            onClick={isFullscreen ? stopFullscreenClose : undefined}
        >
            <div
                className="thumbnail-scrollbar w-full max-w-full overflow-x-auto overscroll-x-contain rounded-md pb-2 pt-1"
                onWheel={handleThumbnailWheel}
            >
                <div
                    className={`flex w-max min-w-full max-w-none justify-center gap-2 px-1 ${
                        isFullscreen ? "py-2" : ""
                    }`}
                >
                    {mediaItems.map((item, index) => {
                        const isSelected = index === currentIndex;

                        return (
                            <button
                                key={`${item.type}-${item.src}-${index}`}
                                type="button"
                                onClick={() => setCurrentIndex(index)}
                                aria-label={`Show slide ${index + 1}`}
                                aria-current={isSelected}
                                className={`h-16 w-20 shrink-0 overflow-hidden rounded-md border bg-white transition focus:outline-none focus:ring-2 focus:ring-primary ${
                                    isSelected
                                        ? "border-primary opacity-100 shadow-sm"
                                        : "border-gray-200 opacity-45 grayscale hover:opacity-75 hover:grayscale-0"
                                } ${isFullscreen ? "bg-black/30" : ""}`}
                            >
                                {item.type === "video" ? (
                                    <video
                                        src={item.src}
                                        muted
                                        preload="metadata"
                                        className="h-full w-full object-cover"
                                    />
                                ) : item.type === "image" ? (
                                    <img
                                        src={item.thumbnailSrc}
                                        alt={`Slide ${index + 1} thumbnail`}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                    />
                                ) : null}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const renderImage = (className: string, fullscreen = false) => {
        if (!currentImage) return null;

        return (
            <picture
                className={
                    fullscreen
                        ? "flex items-center justify-center"
                        : undefined
                }
                style={
                    fullscreen
                        ? {
                              width: isQuarterTurn ? "100cqh" : "100%",
                              height: isQuarterTurn ? "100cqw" : "100%",
                              transform: `rotate(${rotation}deg)`,
                          }
                        : undefined
                }
            >
                <source
                    media="(max-width: 640px)"
                    srcSet={currentImage.mobileSrc}
                />
                <img
                    src={currentImage.src}
                    alt={`Slide ${currentIndex + 1}`}
                    onClick={
                        fullscreen ? handleFullscreenImageClick : undefined
                    }
                    className={className}
                />
            </picture>
        );
    };

    const renderNavigation = (fullscreen = false) => (
        <div
            className={`inline-flex h-10 items-center gap-0.5 rounded-full border p-0.5 shadow-sm ${
                fullscreen
                    ? "border-white/15 bg-black/50 text-white backdrop-blur-sm"
                    : "border-gray-200 bg-white text-primary"
            }`}
            onClick={fullscreen ? stopFullscreenClose : undefined}
        >
            <button
                type="button"
                onClick={prevImage}
                aria-label={t("AuthenticatedView.previous")}
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 ${
                    fullscreen
                        ? "hover:bg-white/15 focus-visible:ring-white/60"
                        : "hover:bg-gray-100 focus-visible:ring-gray-400"
                }`}
            >
                <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="min-w-14 px-1.5 text-center text-sm leading-none tabular-nums">
                {currentIndex + 1} / {total}
            </span>
            <button
                type="button"
                onClick={nextImage}
                aria-label={t("AuthenticatedView.next")}
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 ${
                    fullscreen
                        ? "hover:bg-white/15 focus-visible:ring-white/60"
                        : "hover:bg-gray-100 focus-visible:ring-gray-400"
                }`}
            >
                <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            {fullscreen && (
                <>
                    <div className="mx-0.5 h-5 w-px bg-white/20" />
                    <button
                        type="button"
                        onClick={rotateImage}
                        disabled={isVideo}
                        aria-label="Rotate image"
                        className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                        <ArrowPathIcon
                            className="h-5 w-5"
                            aria-hidden="true"
                        />
                    </button>
                </>
            )}
        </div>
    );

    return (
        <>
            <Dialog
                open={isCarouselFullscreen}
                onClose={closeFullscreen}
                className="fixed inset-0 z-[80] flex items-center justify-center"
            >
                <DialogBackdrop
                    transition
                    className="fixed inset-0 bg-black/80 data-[state=closed]:opacity-0 transition-opacity duration-300"
                />

                <div
                    className="relative z-60 flex h-full w-full min-w-0 flex-col items-center justify-center"
                    onClick={closeFullscreen}
                >
                    <button
                        onClick={(event) => {
                            event.stopPropagation();
                            closeFullscreen();
                        }}
                        aria-label="Close image viewer"
                        className="absolute right-5 top-5 z-50 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/50 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                    </button>

                    <div
                        className={`relative flex min-h-0 w-full flex-1 items-end justify-center overflow-hidden px-6 pt-6 sm:px-10 ${
                            isEnhancedViewer
                                ? "pb-6"
                                : "pb-20"
                        }`}
                    >
                        <div
                            className="relative flex h-full min-h-0 w-full items-center justify-center"
                            style={{ containerType: "size" }}
                        >
                            {isVideo ? (
                                <video
                                    src={src}
                                    controls
                                    autoPlay
                                    onClick={stopFullscreenClose}
                                    className="h-full w-auto max-w-full object-contain"
                                />
                            ) : (
                                renderImage(
                                    "h-full w-full object-contain",
                                    true
                                )
                            )}
                        </div>
                    </div>

                    {isEnhancedViewer ? (
                        <div
                            className="shrink-0 w-full max-w-5xl px-4 pb-4"
                        >
                            <div className="mb-3 flex justify-center">
                                {renderNavigation(true)}
                            </div>
                            {renderThumbnails(true)}
                        </div>
                    ) : (
                        <div className="absolute bottom-6">
                            {renderNavigation(true)}
                        </div>
                    )}
                </div>
            </Dialog>

            <div className="flex min-w-0 flex-col items-center space-y-4">
                <div className="relative aspect-[4/3] w-full min-w-0 overflow-hidden rounded-lg bg-gray-50 p-3">
                    <div
                        onClick={() => {
                            setIsCarouselFullscreen(true);
                        }}
                        className="flex h-full w-full cursor-pointer items-center justify-center"
                    >
                        {isVideo ? (
                            <video
                                src={src}
                                controls
                                autoPlay
                                className="h-full w-full rounded-lg object-contain drop-shadow-md"
                            />
                        ) : (
                            renderImage(
                                "h-full w-full rounded-lg object-contain drop-shadow-md"
                            )
                        )}
                    </div>
                </div>

                {renderNavigation()}

                {isEnhancedViewer && renderThumbnails()}
            </div>
        </>
    );
};

export default ImageCarousel;
