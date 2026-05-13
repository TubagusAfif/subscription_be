import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response.util';
import { AppError } from '../middlewares/error.middleware';

/** 
---------------------------------------------------------------
  Controller handling file upload requests. Returns the URL/path
  of the uploaded file so callers can reference it in payloads.
---------------------------------------------------------------
**/
export class UploadController {
  /** 
  ---------------------------------------------------------------
    Handles a single image file upload (JPEG, PNG, WebP).
    Returns the relative static path of the saved file.
  ---------------------------------------------------------------
  **/
  uploadImage = (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.file) {
        throw new AppError('NO_FILE', 'No file was uploaded', 400);
      }
      const filePath = `/public/uploads/images/${req.file.filename}`;
      res
        .status(200)
        .json(successResponse({ path: filePath, originalName: req.file.originalname }));
    } catch (error) {
      next(error);
    }
  };

  /** 
  ---------------------------------------------------------------
    Handles a single document file upload (PDF, DOC, DOCX).
    Returns the relative static path of the saved file.
  ---------------------------------------------------------------
  **/
  uploadDocument = (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.file) {
        throw new AppError('NO_FILE', 'No file was uploaded', 400);
      }
      const filePath = `/public/uploads/documents/${req.file.filename}`;
      res
        .status(200)
        .json(successResponse({ path: filePath, originalName: req.file.originalname }));
    } catch (error) {
      next(error);
    }
  };
}
