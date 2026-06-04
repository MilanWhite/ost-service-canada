import { useEffect, useState, type MouseEvent, type WheelEvent } from "react";

interface Props {
    images: string[];
    videos: string[];
}

import { Dialog, DialogBackdrop } from "@headlessui/react";
import { useTranslation } from "react-i18next";

const ImageCarousel = ({ images, videos }: Props) => {
    const { t } = useTranslation();
    const isEnhancedViewer =
        import.meta.env.VITE_IMAGE_VIEWER_VARIANT !== "bare";

    const [isCarouselFullscreen, setIsCarouselFullscreen] = useState(false);

    const total = images.length + videos.length;
    const [currentIndex, setCurrentIndex] = useState(0);
    const prevImage = () => setCurrentIndex((i) => (i - 1 + total) % total);
    const nextImage = () => setCurrentIndex((i) => (i + 1) % total);

    useEffect(() => {
        if (currentIndex >= total) {
            setCurrentIndex(0);
        }
    }, [currentIndex, total]);

    if (!images || images.length === 0) {
        return (
            <div className="text-center text-gray-500">
                {t("AuthenticatedView.Errors.no_images_available")}
            </div>
        );
    }

    const isVideo = currentIndex >= images.length;
    const src = isVideo
        ? videos[currentIndex - images.length]
        : images[currentIndex];
    const mediaItems = [
        ...images.map((image) => ({ type: "image" as const, src: image })),
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

    const closeFullscreen = () => setIsCarouselFullscreen(false);

    const stopFullscreenClose = (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
    };

    const renderThumbnails = (isFullscreen = false) => (
        <div className="w-full max-w-full min-w-0 overflow-hidden">
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
                                ) : (
                                    <img
                                        src={item.src}
                                        alt={`Slide ${index + 1} thumbnail`}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <>
            <Dialog
                open={isCarouselFullscreen}
                onClose={closeFullscreen}
                className="fixed inset-0 z-50 flex items-center justify-center"
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
                        className="absolute cursor-pointer p-2 pt-1 top-5 right-5 text-white bg-black bg-opacity-50 hover:bg-opacity-80 rounded-full text-2xl z-50"
                    >
                        &times;
                    </button>

                    <div className="relative flex min-h-0 w-full flex-1 items-end justify-center overflow-hidden pb-10 sm:items-center sm:p-4">
                        <div className="relative flex max-h-full max-w-full items-center justify-center">
                            {isVideo ? (
                                <video
                                    src={src}
                                    controls
                                    autoPlay
                                    onClick={stopFullscreenClose}
                                    className="max-h-full max-w-full object-contain"
                                />
                            ) : (
                                <img
                                    src={src}
                                    alt={`Slide ${currentIndex + 1}`}
                                    onClick={stopFullscreenClose}
                                    className="max-h-full max-w-full object-contain"
                                />
                            )}

                            <button
                                onClick={(event) => {
                                    event.stopPropagation();
                                    prevImage();
                                }}
                                className="absolute left-3 top-1/2 z-40 -translate-y-1/2 transform cursor-pointer rounded-full bg-black bg-opacity-50 p-3 pb-4 text-2xl text-white hover:bg-opacity-80 focus:outline-none"
                            >
                                &#8249;
                            </button>

                            <button
                                onClick={(event) => {
                                    event.stopPropagation();
                                    nextImage();
                                }}
                                className="absolute right-3 top-1/2 z-40 -translate-y-1/2 transform cursor-pointer rounded-full bg-black bg-opacity-50 p-3 pb-4 text-2xl text-white hover:bg-opacity-80 focus:outline-none"
                            >
                                &#8250;
                            </button>
                        </div>
                    </div>

                    {isEnhancedViewer ? (
                        <div
                            className="shrink-0 w-full max-w-5xl px-4 pb-4"
                            onClick={stopFullscreenClose}
                        >
                            <div className="mb-2 text-center text-sm text-white">
                                <span className="rounded bg-black/60 px-3 py-1">
                                    {currentIndex + 1} / {total}
                                </span>
                            </div>
                            {renderThumbnails(true)}
                        </div>
                    ) : (
                        <div
                            className="absolute bottom-6 text-white text-sm bg-black/60 px-3 py-1 rounded"
                            onClick={stopFullscreenClose}
                        >
                            {currentIndex + 1} / {total}
                        </div>
                    )}
                </div>
            </Dialog>

            <div className="flex min-w-0 flex-col items-center space-y-4">
                <div className="relative w-full min-w-0 overflow-hidden rounded-lg bg-gray-50 sm:overflow-visible sm:bg-transparent">
                    <div
                        onClick={() => {
                            setIsCarouselFullscreen(true);
                        }}
                    >
                        {isVideo ? (
                            <video
                                src={src}
                                controls
                                autoPlay
                                className="max-h-[55vh] w-full rounded-lg object-contain shadow-md sm:max-h-none"
                            />
                        ) : (
                            <img
                                src={src}
                                alt={`Slide ${currentIndex + 1}`}
                                className="max-h-[55vh] w-full rounded-lg object-contain shadow-md sm:max-h-none sm:object-cover"
                            />
                        )}
                    </div>

                    <button
                        onClick={prevImage}
                        className="cursor-pointer text-lg text-primary absolute top-1/2 left-2 transform -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 focus:outline-none"
                    >
                        &#8249;
                    </button>

                    <button
                        onClick={nextImage}
                        className="cursor-pointer text-lg text-primary absolute top-1/2 right-2 transform -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 focus:outline-none"
                    >
                        &#8250;
                    </button>
                </div>

                <div className="text-sm text-gray-700">
                    {currentIndex + 1} / {total}
                </div>

                {isEnhancedViewer && renderThumbnails()}
            </div>
        </>
    );
};

export default ImageCarousel;
