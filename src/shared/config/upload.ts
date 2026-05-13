import multer, { StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';

const IMAGE_DIR = path.join(process.cwd(), 'public', 'uploads', 'images');
const DOCUMENT_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents');

// Ensure upload subdirectories exist
[IMAGE_DIR, DOCUMENT_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const createStorage = (destination: string): StorageEngine =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, destination);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });

/** 
---------------------------------------------------------------
  Multer instance for handling image uploads (JPEG, PNG, WebP).
  Files saved to: public/uploads/images/
  Max file size: 5MB.
---------------------------------------------------------------
**/
export const uploadImage = multer({
  storage: createStorage(IMAGE_DIR),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
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
  storage: createStorage(DOCUMENT_DIR),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX documents are allowed'));
    }
  },
});
