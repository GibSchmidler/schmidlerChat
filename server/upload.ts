import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";

// Create upload directory if it doesn't exist
const uploadDir = path.join(process.cwd(), "data", "uploads");
fs.ensureDirSync(uploadDir);

// Configure storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Generate a unique filename with original extension
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// File filter for images
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."));
  }
};

// Set up multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

// Handler for avatar upload
export async function handleAvatarUpload(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).send({ error: "No file uploaded" });
    }
    
    // Return the URL to the uploaded file
    const filename = req.file.filename;
    const fileUrl = `/uploads/${filename}`;
    
    return res.status(200).send({ url: fileUrl });
  } catch (error: any) {
    console.error("Error during file upload:", error);
    return res.status(500).send({ error: error.message || "Failed to upload file" });
  }
}

// Handler to serve uploaded files
export function serveStaticUploads(req: Request, res: Response) {
  const filePath = path.join(uploadDir, path.basename(req.path));
  res.sendFile(filePath);
}