import { Router, RequestHandler } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { uploadImage, uploadDocument } from '../config/upload';

/** 
---------------------------------------------------------------
  Routes for shared file upload endpoints.
  POST /upload/image    - Uploads a single image file.
  POST /upload/document - Uploads a single document file.
---------------------------------------------------------------
**/
export const createUploadRouter = (
  controller: UploadController,
  authenticate: RequestHandler,
): Router => {
  const router = Router();

  router.post('/image', authenticate, uploadImage.single('file'), controller.uploadImage);
  router.post('/document', authenticate, uploadDocument.single('file'), controller.uploadDocument);

  return router;
};
