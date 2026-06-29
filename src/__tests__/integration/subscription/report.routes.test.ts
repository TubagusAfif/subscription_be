import request from 'supertest';
import express from 'express';
import { createReportRouter } from '../../../subscription/routes/report.routes';
import { ReportController } from '../../../subscription/controllers/report.controller';
import { ReportService } from '../../../subscription/services/report.service';

jest.mock('../../../subscription/services/report.service');

const mockReportService = {
  getTransactionReport: jest.fn(),
  generateCSV: jest.fn(),
} as unknown as jest.Mocked<ReportService>;

let mockUser: { sub: number; role: string };
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  if (!req.headers.authorization) {
    return next({ statusCode: 401, message: 'Missing token' });
  }
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());

const reportController = new ReportController({ reportService: mockReportService } as any);
const reportRouter = createReportRouter(reportController, mockAuthenticate);

app.use('/api/v1/subscription/reports', reportRouter);
app.use((err: any, req: any, res: any, next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Report API Routes', () => {
  const validToken = 'valid-token';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 1, role: 'ADMIN' };
  });

  describe('GET /api/v1/subscription/reports/transactions', () => {
    const mockReportData = [
      {
        id: 1,
        date: '2026-06-15T00:00:00.000Z',
        pg_order_id: 'COIN-1-12345',
        client_name: 'John Doe',
        client_email: 'john@example.com',
        coin_amount: 100,
        coin_price: 100000,
        tax_amount: 11000,
        gateway_fee: 4000,
        price_paid: 115000,
        payment_method: 'Virtual Account',
        status: 'PAID',
      },
    ];

    it('should return report data successfully when authenticated as ADMIN', async () => {
      mockReportService.getTransactionReport.mockResolvedValue({
        data: mockReportData,
        total: 1,
        meta: { page: 1, limit: 10, total_pages: 1, total_count: 1 },
      });

      const response = await request(app)
        .get('/api/v1/subscription/reports/transactions')
        .set('Authorization', `Bearer ${validToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].coin_price).toBe(100000);
      expect(response.body.data[0].gateway_fee).toBe(4000);
      expect(mockReportService.getTransactionReport).toHaveBeenCalled();
    });

    it('should return CSV file when format=csv is queried', async () => {
      mockReportService.getTransactionReport.mockResolvedValue({
        data: mockReportData,
        total: 1,
      });
      mockReportService.generateCSV.mockReturnValue('Header1,Header2\nValue1,Value2');

      const response = await request(app)
        .get('/api/v1/subscription/reports/transactions')
        .set('Authorization', `Bearer ${validToken}`)
        .query({ format: 'csv' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain(
        'attachment; filename=transaction-report',
      );
      expect(response.text).toBe('Header1,Header2\nValue1,Value2');
    });

    it('should return 403 if user is not ADMIN or OWNER', async () => {
      mockUser = { sub: 2, role: 'MEMBER' }; // Wait, role 'MEMBER' should fail. Let's see roles.
      const response = await request(app)
        .get('/api/v1/subscription/reports/transactions')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
    });
  });
});
