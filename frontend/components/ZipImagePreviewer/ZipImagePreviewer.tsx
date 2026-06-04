import {
    useState,
    useEffect,
    Dispatch,
    SetStateAction,
    useRef,
    useMemo,
} from "react";
import JSZip from "jszip";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { useTranslation } from "react-i18next";
import { IMAGE_FILE_ACCEPT, MEDIA_FILE_ACCEPT } from "../../src/config/fileTypes";

type MediaKind = "image" | "video";

interface MediaItem {
    file: File;
    kind: MediaKind;
}

interface DragState {
    kind: MediaKind;
    index: number;
}

interface Props {
    files: File[];
    setFiles: Dispatch<SetStateAction<File[]>>;
    thumbnail: File | null;
    setThumbnail: Dispatch<SetStateAction<File | null>>;
    disableThumbnailSelection?: boolean;
    videos?: File[];
    setVideos?: Dispatch<SetStateAction<File[]>>;
    allowVideos?: boolean;

    preferredThumbnailName?: string;
}

const IMAGE_EXTENSION = /\.(png|jpe?g|jfif|gif|webp|bmp|svg|heic|heif|avif)$/i;
const VIDEO_EXTENSION = /\.(mp4|m4v|mov|webm|ogv|avi|mkv|wmv)$/i;
const ZIP_EXTENSION = /\.zip$/i;

const imageMimeByExtension: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".jfif": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml",
    ".heic": "image/heic",
    ".heif": "image/heif",
    ".avif": "image/avif",
};

const videoMimeByExtension: Record<string, string> = {
    ".mp4": "video/mp4",
    ".m4v": "video/x-m4v",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".ogv": "video/ogg",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
    ".wmv": "video/x-ms-wmv",
};

const getExtension = (name: string) => {
    const dotIndex = name.lastIndexOf(".");
    return dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : "";
};

const getMediaKind = (name: string, type = ""): MediaKind | null => {
    if (type.startsWith("image/") || IMAGE_EXTENSION.test(name)) return "image";
    if (type.startsWith("video/") || VIDEO_EXTENSION.test(name)) return "video";
    return null;
};

const getMimeType = (name: string, fallback = "") => {
    const ext = getExtension(name);
    return imageMimeByExtension[ext] ?? videoMimeByExtension[ext] ?? fallback;
};

const getNameFromPath = (value?: string) => {
    if (!value) return "";

    try {
        const parsed = new URL(value);
        return decodeURIComponent(parsed.pathname.split("/").pop() ?? "");
    } catch {
        return decodeURIComponent(value.split("?")[0].split("/").pop() ?? "");
    }
};

const getFileKey = (f: File) => `${f.name}-${f.lastModified}-${f.size}`;

const reorderArray = <T,>(items: T[], from: number, to: number) => {
    if (from === to) return items;

    const next = [...items];
    const [moved] = next.splice(from, 1);
    if (!moved) return items;

    next.splice(to, 0, moved);
    return next;
};

export default function ZipImagePreviewer({
    files,
    setFiles,
    thumbnail,
    setThumbnail,
    disableThumbnailSelection = false,
    videos = [],
    setVideos,
    allowVideos = false,
    preferredThumbnailName,
}: Props) {
    const { t } = useTranslation();

    const [urlMap, setUrlMap] = useState<Map<string, string>>(new Map());
    const [dragOverKey, setDragOverKey] = useState<string | null>(null);
    const [draggingKey, setDraggingKey] = useState<string | null>(null);
    const dragState = useRef<DragState | null>(null);

    const mediaItems = useMemo<MediaItem[]>(() => {
        const imageItems = files.map((file) => ({ file, kind: "image" as const }));
        const videoItems = allowVideos
            ? videos.map((file) => ({ file, kind: "video" as const }))
            : [];

        return [...imageItems, ...videoItems];
    }, [allowVideos, files, videos]);

    function makeUniqueName(name: string, existingNames: Set<string>): string {
        const match = name.match(/^(.*?)(\.[^.]+)?$/)!;
        const base = match[1];
        const ext = match[2] || "";
        let candidate = name;
        let i = 1;
        while (existingNames.has(candidate.toLowerCase())) {
            candidate = `${base}(${i++})${ext}`;
        }
        existingNames.add(candidate.toLowerCase());
        return candidate;
    }

    const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const pickedFiles = Array.from(e.target.files ?? []);
        if (pickedFiles.length === 0) return;

        const existing = new Set(
            [...files, ...(allowVideos ? videos : [])].map((f) =>
                f.name.toLowerCase()
            )
        );
        const incomingImages: File[] = [];
        const incomingVideos: File[] = [];

        for (const picked of pickedFiles) {
            if (ZIP_EXTENSION.test(picked.name)) {
                try {
                    const buf = await picked.arrayBuffer();
                    const zip = await JSZip.loadAsync(buf);
                    const entries = Object.values(zip.files).filter(
                        (entry) => !entry.dir
                    );

                    for (const entry of entries) {
                        const rawName = entry.name.split("/").pop();
                        if (!rawName) continue;

                        const kind = getMediaKind(rawName);
                        if (!kind || (kind === "video" && !allowVideos)) {
                            continue;
                        }

                        const blob = await entry.async("blob");
                        const uniqueName = makeUniqueName(rawName, existing);
                        const file = new File([blob], uniqueName, {
                            type: getMimeType(rawName, blob.type),
                            lastModified: entry.date?.getTime() ?? Date.now(),
                        });

                        if (kind === "image") {
                            incomingImages.push(file);
                        } else {
                            incomingVideos.push(file);
                        }
                    }
                } catch {
                    continue;
                }

                continue;
            }

            const kind = getMediaKind(picked.name, picked.type);
            if (!kind || (kind === "video" && !allowVideos)) continue;

            const uniqueName = makeUniqueName(picked.name, existing);
            const file = new File([picked], uniqueName, {
                type: getMimeType(picked.name, picked.type),
                lastModified: picked.lastModified,
            });

            if (kind === "image") {
                incomingImages.push(file);
            } else {
                incomingVideos.push(file);
            }
        }

        if (incomingImages.length > 0) {
            setFiles((prev) => [...prev, ...incomingImages]);
        }

        if (incomingVideos.length > 0 && setVideos) {
            setVideos((prev) => [...prev, ...incomingVideos]);
        }

        e.target.value = "";
    };

    useEffect(() => {
        const m = new Map<string, string>();
        mediaItems.forEach(({ file }) =>
            m.set(getFileKey(file), URL.createObjectURL(file))
        );
        setUrlMap(m);
        return () => m.forEach((u) => URL.revokeObjectURL(u));
    }, [mediaItems]);

    const removeFile = (item: MediaItem) => {
        if (item.kind === "image") {
            setFiles((prev) => {
                const next = prev.filter(
                    (x) => getFileKey(x) !== getFileKey(item.file)
                );
                if (
                    thumbnail &&
                    getFileKey(thumbnail) === getFileKey(item.file)
                ) {
                    setThumbnail(null);
                }
                return next;
            });
        } else {
            setVideos?.((prev) =>
                prev.filter((x) => getFileKey(x) !== getFileKey(item.file))
            );
        }

        const url = urlMap.get(getFileKey(item.file));
        if (url) URL.revokeObjectURL(url);
    };

    const reorder = ({ kind, index: from }: DragState, to: number) => {
        if (kind === "image") {
            setFiles((prev) => reorderArray(prev, from, to));
            return;
        }

        if (setVideos) {
            setVideos((prev) => reorderArray(prev, from, to));
        }
    };

    const handleDragOver = (
        e: React.DragEvent<HTMLDivElement>,
        targetItem: MediaItem
    ) => {
        const activeDrag = dragState.current;
        if (!activeDrag || activeDrag.kind !== targetItem.kind) return;

        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverKey(getFileKey(targetItem.file));
    };

    const handleDrop = (targetItem: MediaItem, targetIndex: number) => {
        const activeDrag = dragState.current;

        if (activeDrag && activeDrag.kind === targetItem.kind) {
            reorder(activeDrag, targetIndex);
        }

        dragState.current = null;
        setDraggingKey(null);
        setDragOverKey(null);
    };

    useEffect(() => {
        if (
            thumbnail &&
            allowVideos &&
            videos.some(
                (video) => getFileKey(video) === getFileKey(thumbnail)
            )
        ) {
            setThumbnail(null);
        }
    }, [allowVideos, setThumbnail, thumbnail, videos]);

    useEffect(() => {
        if (disableThumbnailSelection || files.length === 0) return;

        const thumbnailStillExists =
            thumbnail &&
            files.some((file) => getFileKey(file) === getFileKey(thumbnail));

        if (!thumbnailStillExists) {
            setThumbnail(files[0]);
        }
    }, [disableThumbnailSelection, files, setThumbnail, thumbnail]);

    return (
        <div className="space-y-4">
            <input
                type="file"
                accept={allowVideos ? MEDIA_FILE_ACCEPT : `.zip,${IMAGE_FILE_ACCEPT}`}
                multiple
                onChange={handleSelect}
                className="block w-full text-sm text-gray-700"
            />

            {mediaItems.length > 0 && (
                <div className="relative max-h-[32rem] overflow-y-auto border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {mediaItems.map((item, idx) => {
                            const { file, kind } = item;
                            const itemKey = getFileKey(file);
                            const kindIndex =
                                kind === "image" ? idx : idx - files.length;
                            const preferredName =
                                getNameFromPath(preferredThumbnailName).toLowerCase();
                            const isThumb = thumbnail
                                ? itemKey === getFileKey(thumbnail)
                                : kind === "image" &&
                                  preferredName === file.name.toLowerCase();
                            return (
                                <div
                                    key={itemKey}
                                    draggable
                                    onDragStart={(e) => {
                                        dragState.current = {
                                            kind,
                                            index: kindIndex,
                                        };
                                        setDraggingKey(itemKey);
                                        e.dataTransfer.effectAllowed = "move";
                                        e.dataTransfer.setData(
                                            "text/plain",
                                            itemKey
                                        );
                                    }}
                                    onDragOver={(e) =>
                                        handleDragOver(e, item)
                                    }
                                    onDrop={() => {
                                        handleDrop(item, kindIndex);
                                    }}
                                    onDragEnd={() => {
                                        dragState.current = null;
                                        setDraggingKey(null);
                                        setDragOverKey(null);
                                    }}
                                    onDragLeave={() => {
                                        if (dragOverKey === itemKey) {
                                            setDragOverKey(null);
                                        }
                                    }}
                                    className={`relative flex flex-col cursor-move select-none transition-transform duration-150 ${
                                        isThumb
                                            ? "ring-2 ring-primary ring-offset-2"
                                            : "hover:ring-2 hover:ring-gray-300"
                                    } ${
                                        dragOverKey === itemKey
                                            ? "scale-[0.98] ring-2 ring-primary ring-offset-2"
                                            : ""
                                    } ${
                                        draggingKey === itemKey
                                            ? "opacity-50"
                                            : "opacity-100"
                                    } rounded-md`}
                                >
                                    {/* remove */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile(item);
                                        }}
                                        className="absolute top-1 right-1 z-20 bg-white/80 backdrop-blur-sm rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-500 hover:text-white"
                                        title="Remove"
                                    >
                                        <XMarkIcon className="w-3" />
                                    </button>

                                    {/* pick thumbnail */}
                                    {kind === "image" ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (
                                                    !disableThumbnailSelection
                                                ) {
                                                    setThumbnail(file);
                                                }
                                            }}
                                            className="focus:outline-none"
                                        >
                                            {!disableThumbnailSelection &&
                                                isThumb && (
                                                    <span className="absolute top-1 left-1 z-10 bg-primary text-white text-[10px] px-1.5 py-[1px] rounded">
                                                        {t(
                                                            "AuthenticatedView.thumbnail"
                                                        )}
                                                    </span>
                                                )}
                                            <img
                                                src={urlMap.get(itemKey)}
                                                alt={file.name}
                                                className="w-full aspect-video object-contain rounded-md bg-gray-50"
                                            />
                                        </button>
                                    ) : (
                                        <div className="relative">
                                            <span className="absolute top-1 left-1 z-10 bg-gray-900/80 text-white text-[10px] px-1.5 py-[1px] rounded">
                                                {t(
                                                    "AuthenticatedView.video"
                                                )}
                                            </span>
                                            <video
                                                src={urlMap.get(itemKey)}
                                                controls
                                                preload="metadata"
                                                className="w-full aspect-video object-contain rounded-md bg-black"
                                            />
                                        </div>
                                    )}

                                    <figcaption className="text-xs mt-1 truncate px-1">
                                        {file.name}
                                    </figcaption>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
