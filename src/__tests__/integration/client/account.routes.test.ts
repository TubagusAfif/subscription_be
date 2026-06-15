import express from 'express';
import request from 'supertest';
import { createClientAccountRouter } from '../../../../src/client/routes/account.routes';
import { ClientAccountController } from '../../../../src/client/controllers/account.controller';
import { ClientAccountService } from '../../../../src/client/services/account.service';
import { AppError, errorHandler } from '../../../../src/shared/middlewares/error.middleware';

describe('Client Account Routes Integration', () => {
  let app: express.Express;
  let mockAccountService: jest.Mocked<ClientAccountService>;

  beforeEach(() => {
    mockAccountService = {
      getAccount: jest.fn(),
      updateAccount: jest.fn(),
      changePassword: jest.fn(),
    } as unknown as jest.Mocked<ClientAccountService>;

    const accountController = new ClientAccountController({ accountService: mockAccountService });

    // Mock authenticate middleware
    const mockAuthenticate = (req: any, res: any, next: any) => {
      // Simulate an authenticated user
      req.user = { sub: 1, role: 'OWNER' };
      next();
    };

    const router = createClientAccountRouter(accountController, mockAuthenticate as any);

    app = express();
    app.use(express.json());
    app.use('/api/v1/client/account', router);
    app.use(errorHandler);
  });

  describe('GET /api/v1/client/account/me', () => {
    it('should return 200 and the user profile on success', async () => {
      const dbResponse = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'OWNER',
        phone: '123456789',
        is_active: true,
        created_at: new Date('2025-01-01T00:00:00.000Z'),
        password_hash: 'secret',
        profile: {
          city: 'Jakarta',
          country: 'ID'
        }
      };

      mockAccountService.getAccount.mockResolvedValue(dbResponse as any);

      const response = await request(app).get('/api/v1/client/account/me');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('John Doe');
      expect(response.body.data.profile.city).toBe('Jakarta');
    });

    it('should return 404 if account not found', async () => {
      mockAccountService.getAccount.mockRejectedValue(new AppError('NOT_FOUND', 'User account not found', 404));

      const response = await request(app).get('/api/v1/client/account/me');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/v1/client/account/me', () => {
    it('should return 400 validation error if name is missing', async () => {
      const response = await request(app)
        .put('/api/v1/client/account/me')
        .send({ phone: '123456' }); // Missing 'name'

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 validation error if photo_url is a full URL', async () => {
      const response = await request(app)
        .put('/api/v1/client/account/me')
        .send({ name: 'John', profile: { photo_url: 'https://example.com/photo.jpg' } });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should update and return 200 on valid input', async () => {
      mockAccountService.updateAccount.mockResolvedValue({
        id: 1,
        name: 'Updated Name',
        email: 'john@example.com',
      } as any);

      const response = await request(app)
        .put('/api/v1/client/account/me')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
    });
  });

  describe('PATCH /api/v1/client/account/password', () => {
    it('should return 400 if currentPassword missing', async () => {
      const response = await request(app)
        .patch('/api/v1/client/account/password')
        .send({ newPassword: 'newpassword123' });

      expect(response.status).toBe(400);
    });

    it('should return 200 on success', async () => {
      mockAccountService.changePassword.mockResolvedValue();

      const response = await request(app)
        .patch('/api/v1/client/account/password')
        .send({ currentPassword: 'old', newPassword: 'newpassword123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Password updated successfully');
    });
  });
});
