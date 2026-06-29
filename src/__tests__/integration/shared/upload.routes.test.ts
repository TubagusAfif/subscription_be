import request from 'supertest';
import express from 'express';
import { createUploadRouter } from '../../../shared/routes/upload.routes';
import { UploadController } from '../../../shared/controllers/upload.controller';

// Replace multer with a lightweight middleware so no real files are written.
// req.file is taken from a per-test global so we can exercise the no-file branch.
jest.mock('../../../shared/config/upload', () => ({
  uploadImage: {
    single: () => (req: any, _res: any, next: any) => {
      req.file = (global as any).__mockUploadFile;
      next();
    },
  },
  uploadDocument: {
    single: () => (req: any, _res: any, next: any) => {
      req.file = (global as any).__mockUploadFile;
      next();
    },
  },
}));

let mockUser: { sub: number; role: string } | null;
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  if (!req.headers.authorization) return next({ statusCode: 401, message: 'Missing token' });
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());
const controller = new UploadController();
app.use('/api/v1/upload', createUploadRouter(controller, mockAuthenticate));
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Upload API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 1, role: 'ADMIN' };
    (global as any).__mockUploadFile = undefined;
  });

  describe('POST /image', () => {
    it('should return the saved path when an image is uploaded', async () => {
      (global as any).__mockUploadFile = { filename: 'abc.png', originalname: 'logo.png' };

      const res = await request(app)
        .post('/api/v1/upload/image')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(res.body.data.path).toBe('/public/uploads/images/abc.png');
      expect(res.body.data.originalName).toBe('logo.png');
    });

    it('should return 400 when no file was uploaded', async () => {
      (global as any).__mockUploadFile = undefined;

      const res = await request(app)
        .post('/api/v1/upload/image')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NO_FILE');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).post('/api/v1/upload/image');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /document', () => {
    it('should return the saved path when a document is uploaded', async () => {
      (global as any).__mockUploadFile = { filename: 'doc.pdf', originalname: 'contract.pdf' };

      const res = await request(app)
        .post('/api/v1/upload/document')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(res.body.data.path).toBe('/public/uploads/documents/doc.pdf');
    });

    it('should return 400 when no document was uploaded', async () => {
      const res = await request(app)
        .post('/api/v1/upload/document')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(400);
    });
  });
});
