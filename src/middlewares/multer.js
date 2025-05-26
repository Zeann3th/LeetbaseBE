import multer from "multer";
import path from "path";

export const codeUploader = multer({ storage: multer.memoryStorage() });

export const imageUploader = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"];
        const allowedMimeTypes = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/avif"
        ];
        if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(file.mimetype)) {
            const err = new Error("Invalid file type. Only images are allowed.");
            err.name = "INVALID_FILE_TYPE";
            return cb(err, false);
        }
        cb(null, true);
    }
});
