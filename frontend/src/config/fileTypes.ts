const imageExtensions = [
    ".png",
    ".jpg",
    ".jpeg",
    ".jfif",
    ".gif",
    ".webp",
    ".bmp",
    ".svg",
    ".heic",
    ".heif",
    ".avif",
];

const videoExtensions = [
    ".mp4",
    ".m4v",
    ".mov",
    ".webm",
    ".ogv",
    ".avi",
    ".mkv",
    ".wmv",
];

const documentExtensions = [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".csv",
    ".txt",
    ".rtf",
    ".odt",
];

const documentMimeTypes = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain",
    "application/rtf",
    "text/rtf",
    "application/vnd.oasis.opendocument.text",
]);

const getExtension = (name: string) => {
    const dotIndex = name.lastIndexOf(".");
    return dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : "";
};

export const IMAGE_FILE_ACCEPT = ["image/*", ...imageExtensions].join(",");
export const MEDIA_FILE_ACCEPT = [
    ".zip",
    "image/*",
    "video/*",
    ...imageExtensions,
    ...videoExtensions,
].join(",");
export const DOCUMENT_FILE_ACCEPT = documentExtensions.join(",");

export const isDocumentFile = (file: File) =>
    documentExtensions.includes(getExtension(file.name)) ||
    documentMimeTypes.has(file.type);
