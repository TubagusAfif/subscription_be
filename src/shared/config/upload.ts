import multer, { StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const IMAGE_DIR = path.join(process.cwd(), 'public', 'uploads', 'images');
const DOCUMENT_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents');

// Ensure upload subdirectories exist
[IMAGE_DIR, DOCUMENT_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Server-controlled MIME -> extension maps. The saved filename extension is
// ALWAYS derived from the validated MIME type here, never from the client's
// originalname. This prevents an attacker from uploading e.g. content typed as
// image/png but named "x.html" (or an SVG) and having it served as executable
// HTML/SVG from the public static folder (stored XSS).
//
// Note: image/svg+xml is intentionally NOT allowed — SVGs can embed scripts and
// would execute in our origin when opened directly.
const IMAGE_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const DOCUMENT_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

const createStorage = (destination: string, extMap: Record<string, string>): StorageEngine =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, destination);
    },
    filename: (_req, file, cb) => {
      const ext = extMap[file.mimetype];
      if (!ext) {
        // Should be unreachable — fileFilter rejects unknown types first — but
        // fail closed rather than fall back to a client-controlled extension.
        cb(new Error('Unsupported file type'), '');
        return;
      }
      const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}`;
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });

/** 
---------------------------------------------------------------
  Multer instance for handling image uploads (JPEG, PNG, WebP, SVG).
  Files saved to: public/uploads/images/
  Max file size: 5MB.
---------------------------------------------------------------
**/
export const uploadImage = multer({
  storage: createStorage(IMAGE_DIR, IMAGE_EXT),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (IMAGE_EXT[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

/** 
---------------------------------------------------------------
  Multer instance for handling document uploads (PDF, DOCX, DOC).
  Files saved to: public/uploads/documents/
  Max file size: 10MB.
---------------------------------------------------------------
**/
export const uploadDocument = multer({
  storage: createStorage(DOCUMENT_DIR, DOCUMENT_EXT),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (DOCUMENT_EXT[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX documents are allowed'));
    }
  },
});
