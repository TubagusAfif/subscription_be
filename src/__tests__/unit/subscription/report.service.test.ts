import { ReportService } from '../../../subscription/services/report.service';

describe('ReportService', () => {
  let service: ReportService;

  const mockCoinOrderRepo = {
    getTransactionReport: jest.fn(),
    getChartReport: jest.fn(),
  };
  const mockCoinTransactionRepo = {
    getPaymentReportDetailed: jest.fn(),
    getPaymentReportByMethod: jest.fn(),
    getPaymentReportChart: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportService(mockCoinOrderRepo as any, mockCoinTransactionRepo as any);
  });

  describe('getTransactionReport', () => {
    const rawOrder = {
      id: 1,
      created_at: new Date('2025-01-15T10:00:00.000Z'),
      pg_order_id: 'COIN-1',
      user: { name: 'Alice', email: 'alice@example.com' },
      coin_amount: 100,
      coin_price: '90000',
      tax_amount: '9900',
      gateway_fee: '4000',
      price_paid: '103900',
      payment_method: { name: 'Virtual Account' },
      status: 'PAID',
    };

    it('should default status to PAID and format rows with numeric coercion', async () => {
      mockCoinOrderRepo.getTransactionReport.mockResolvedValue({ data: [rawOrder], total: 1 });

      const result = await service.getTransactionReport({});

      expect(mockCoinOrderRepo.getTransactionReport).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PAID' }),
      );
      expect(result.data[0]).toMatchObject({
        id: 1,
        pg_order_id: 'COIN-1',
        client_name: 'Alice',
        client_email: 'alice@example.com',
        coin_price: 90000,
        tax_amount: 9900,
        gateway_fee: 4000,
        price_paid: 103900,
        payment_method: 'Virtual Account',
        status: 'PAID',
      });
      expect(result.meta).toBeUndefined();
    });

    it('should fall back to placeholders for missing user/order fields', async () => {
      const partial = { ...rawOrder, pg_order_id: null, user: null, payment_method: null };
      mockCoinOrderRepo.getTransactionReport.mockResolvedValue({ data: [partial], total: 1 });

      const result = await service.getTransactionReport({});

      expect(result.data[0]).toMatchObject({
        pg_order_id: 'ORDER-1',
        client_name: 'Unknown',
        client_email: 'Unknown',
        payment_method: 'Unknown',
      });
    });

    it('should honor an explicit status filter and normalize the date range', async () => {
      mockCoinOrderRepo.getTransactionReport.mockResolvedValue({ data: [], total: 0 });

      await service.getTransactionReport({
        status: 'PENDING',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      const arg = mockCoinOrderRepo.getTransactionReport.mock.calls[0][0];
      expect(arg.status).toBe('PENDING');
      expect(arg.startDate.getHours()).toBe(0);
      expect(arg.endDate.getHours()).toBe(23);
    });

    it('should include pagination meta when both page and limit are provided', async () => {
      mockCoinOrderRepo.getTransactionReport.mockResolvedValue({ data: [rawOrder], total: 1 });

      const result = await service.getTransactionReport({ page: 1, limit: 10 });

      expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 10 });
    });
  });

  describe('getChartReport', () => {
    it('should bucket by day for short ranges (<= 30 days)', async () => {
      mockCoinOrderRepo.getChartReport.mockResolvedValue([]);

      const result = await service.getChartReport({
        startDate: '2025-01-01',
        endDate: '2025-01-10',
      });

      expect(result.interval).toBe('day');
      expect(mockCoinOrderRepo.getChartReport).toHaveBeenCalledWith(
        expect.objectContaining({ interval: 'day' }),
      );
    });

    it('should bucket by week for medium ranges (31-90 days)', async () => {
      mockCoinOrderRepo.getChartReport.mockResolvedValue([]);

      const result = await service.getChartReport({
        startDate: '2025-01-01',
        endDate: '2025-03-01',
      });

      expect(result.interval).toBe('week');
    });

    it('should bucket by month for long ranges (> 90 days)', async () => {
      mockCoinOrderRepo.getChartReport.mockResolvedValue([]);

      const result = await service.getChartReport({
        startDate: '2025-01-01',
        endDate: '2025-06-01',
      });

      expect(result.interval).toBe('month');
    });

    it('should format month buckets as YYYY-MM and coerce numbers', async () => {
      mockCoinOrderRepo.getChartReport.mockResolvedValue([
        {
          date: new Date('2025-02-01T00:00:00.000Z'),
          total_orders: '5',
          total_price_paid: '500',
        },
      ]);

      const result = await service.getChartReport({
        startDate: '2025-01-01',
        endDate: '2025-06-01',
      });

      expect(result.results[0]).toMatchObject({
        date: '2025-02',
        total_orders: 5,
        total_price_paid: 500,
        total_tax_amount: 0,
      });
    });
  });

  describe('getCoinPaymentReport', () => {
    it('should format detailed payment rows', async () => {
      mockCoinTransactionRepo.getPaymentReportDetailed.mockResolvedValue({
        data: [
          {
            id: 7,
            date: new Date('2025-01-20T00:00:00.000Z'),
            pg_order_id: 'COIN-7',
            client_name: 'Bob',
            client_email: 'bob@example.com',
            coin_amount: '50',
            coin_price: '45000',
            tax_amount: '4950',
            gateway_fee: '4000',
            price_paid: '53950',
            payment_method: 'Credit Card',
            payment_channel: 'visa',
          },
        ],
        total: 1,
      });

      const result = await service.getCoinPaymentReport({});

      expect(result.data[0]).toMatchObject({
        id: 7,
        coin_amount: 50,
        coin_price: 45000,
        payment_method: 'Credit Card',
        payment_channel: 'visa',
      });
    });

    it('should default missing optional fields and add meta when paginated', async () => {
      mockCoinTransactionRepo.getPaymentReportDetailed.mockResolvedValue({
        data: [
          {
            id: 8,
            date: new Date('2025-01-20T00:00:00.000Z'),
            pg_order_id: null,
            coin_amount: 10,
          },
        ],
        total: 1,
      });

      const result = await service.getCoinPaymentReport({ page: 1, limit: 5 });

      expect(result.data[0]).toMatchObject({
        pg_order_id: 'ORDER-8',
        client_name: 'Unknown',
        coin_price: 0,
        payment_channel: '',
      });
      expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 5 });
    });
  });

  describe('getCoinPaymentByMethod', () => {
    it('should map aggregated rows with numeric coercion', async () => {
      mockCoinTransactionRepo.getPaymentReportByMethod.mockResolvedValue([
        {
          payment_method_id: 1,
          payment_method: 'Virtual Account',
          total_orders: '3',
          total_price_paid: '300',
        },
      ]);

      const result = await service.getCoinPaymentByMethod({});

      expect(result[0]).toMatchObject({
        payment_method_id: 1,
        payment_method: 'Virtual Account',
        total_orders: 3,
        total_price_paid: 300,
        total_tax_amount: 0,
      });
    });
  });

  describe('getCoinPaymentChart', () => {
    it('should bucket by day for short ranges and coerce numbers', async () => {
      mockCoinTransactionRepo.getPaymentReportChart.mockResolvedValue([
        { date: new Date('2025-01-05T00:00:00.000Z'), total_orders: '2', total_coin_price: '180' },
      ]);

      const result = await service.getCoinPaymentChart({
        startDate: '2025-01-01',
        endDate: '2025-01-10',
      });

      expect(result.interval).toBe('day');
      expect(result.results[0]).toMatchObject({
        date: '2025-01-05',
        total_orders: 2,
        total_coin_price: 180,
      });
    });
  });

  describe('generateCSV', () => {
    it('should produce a header row and a quoted data row', () => {
      const csv = service.generateCSV([
        {
          id: 1,
          date: '2025-01-15',
          pg_order_id: 'COIN-1',
          client_name: 'Alice',
          client_email: 'alice@example.com',
          coin_amount: 100,
          coin_price: 90000,
          tax_amount: 9900,
          gateway_fee: 4000,
          price_paid: 103900,
          payment_method: 'VA',
          status: 'PAID',
        },
      ]);

      const lines = csv.split('\n');
      expect(lines[0]).toContain('Date,PG Order ID,Client Name');
      expect(lines[1]).toContain('"COIN-1"');
      expect(lines[1]).toContain('"Alice"');
    });

    it('should escape embedded double quotes', () => {
      const csv = service.generateCSV([
        { client_name: 'A "Nick" B' } as any,
      ]);
      expect(csv.split('\n')[1]).toContain('"A ""Nick"" B"');
    });
  });

  describe('generateCoinPaymentCSV', () => {
    it('should include the Payment Channel column', () => {
      const csv = service.generateCoinPaymentCSV([
        { pg_order_id: 'COIN-7', payment_channel: 'visa' } as any,
      ]);
      expect(csv.split('\n')[0]).toContain('Payment Channel');
      expect(csv.split('\n')[1]).toContain('"visa"');
    });
  });
});
