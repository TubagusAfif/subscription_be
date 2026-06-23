import { CoinOrderRepository } from '../../client/repositories/coin-order.repository';
import { CoinTransactionRepository } from '../../client/repositories/coin-transaction.repository';
import { PaginatedResult } from '../../shared/types/pagination.types';
import { paginate } from '../../shared/utils/pagination.util';

export interface TransactionReportFilters {
  startDate?: string | undefined;
  endDate?: string | undefined;
  paymentMethodId?: number | undefined;
  status?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface FormattedReportRow {
  id: number;
  date: string;
  pg_order_id: string;
  client_name: string;
  client_email: string;
  coin_amount: number;
  coin_price: number;
  tax_amount: number;
  gateway_fee: number;
  price_paid: number;
  payment_method: string;
  status: string;
}

export interface CoinPaymentReportRow {
  id: number;
  date: string;
  pg_order_id: string;
  client_name: string;
  client_email: string;
  coin_amount: number;
  coin_price: number;
  tax_amount: number;
  gateway_fee: number;
  price_paid: number;
  payment_method: string;
  payment_channel: string;
}

export class ReportService {
  constructor(
    private readonly coinOrderRepository: CoinOrderRepository,
    private readonly coinTransactionRepository: CoinTransactionRepository,
  ) {}

  async getTransactionReport(
    filters: TransactionReportFilters,
  ): Promise<{ data: FormattedReportRow[]; total: number; meta?: any }> {
    const startDate = filters.startDate ? new Date(filters.startDate) : undefined;
    if (startDate) {
      startDate.setHours(0, 0, 0, 0);
    }

    const endDate = filters.endDate ? new Date(filters.endDate) : undefined;
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }

    // Default status to PAID if not specified, since reports generally focus on successful revenue
    const status = filters.status || 'PAID';

    const result = await this.coinOrderRepository.getTransactionReport({
      startDate,
      endDate,
      paymentMethodId: filters.paymentMethodId,
      status,
      page: filters.page,
      limit: filters.limit,
    });

    const formattedData = result.data.map((order: any) => ({
      id: order.id,
      date: order.created_at.toISOString(),
      pg_order_id: order.pg_order_id || `ORDER-${order.id}`,
      client_name: order.user?.name || 'Unknown',
      client_email: order.user?.email || 'Unknown',
      coin_amount: order.coin_amount,
      coin_price: Number(order.coin_price),
      tax_amount: Number(order.tax_amount),
      gateway_fee: Number(order.gateway_fee),
      price_paid: Number(order.price_paid),
      payment_method: order.payment_method?.name || 'Unknown',
      status: order.status,
    }));

    if (filters.page && filters.limit) {
      const paginated = paginate(formattedData, result.total, filters.page, filters.limit);
      return { data: paginated.data, total: result.total, meta: paginated.meta };
    }

    return { data: formattedData, total: result.total };
  }

  async getChartReport(filters: TransactionReportFilters) {
    const startDate = filters.startDate ? new Date(filters.startDate) : undefined;
    if (startDate) {
      startDate.setHours(0, 0, 0, 0);
    }

    const endDate = filters.endDate ? new Date(filters.endDate) : undefined;
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }

    const status = filters.status || 'PAID';

    // Dynamic interval bucketing
    let interval: 'day' | 'week' | 'month' = 'day';
    if (startDate && endDate) {
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 90) {
        interval = 'month';
      } else if (diffDays > 30) {
        interval = 'week';
      }
    }

    const rawData = await this.coinOrderRepository.getChartReport({
      startDate,
      endDate,
      paymentMethodId: filters.paymentMethodId,
      status,
      interval,
    });

    const formattedData = rawData.map(row => {
      const rowDate = row.date instanceof Date ? row.date : new Date(row.date);
      let dateString = rowDate.toISOString().split('T')[0];

      if (interval === 'month') {
        // Return YYYY-MM format
        dateString = dateString.substring(0, 7);
      } else if (interval === 'week') {
        // Return YYYY-MM-DD representing the start of that week
        // Could also format as YYYY-Wxx, but standard ISO date is easier to parse in FE
        dateString = dateString;
      }

      return {
        date: dateString,
        total_orders: Number(row.total_orders),
        total_coin_price: Number(row.total_coin_price || 0),
        total_tax_amount: Number(row.total_tax_amount || 0),
        total_gateway_fee: Number(row.total_gateway_fee || 0),
        total_price_paid: Number(row.total_price_paid || 0),
      };
    });

    return {
      interval,
      results: formattedData
    };
  }

  // ===========================================================================
  // Coin-payment report (transaction-based, calculable by payment method)
  // ===========================================================================

  private normalizeDateRange(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    if (start) start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : undefined;
    if (end) end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  async getCoinPaymentReport(
    filters: TransactionReportFilters,
  ): Promise<{ data: CoinPaymentReportRow[]; total: number; meta?: any }> {
    const { start, end } = this.normalizeDateRange(filters.startDate, filters.endDate);

    const result = await this.coinTransactionRepository.getPaymentReportDetailed({
      startDate: start,
      endDate: end,
      paymentMethodId: filters.paymentMethodId,
      page: filters.page,
      limit: filters.limit,
    });

    const formattedData: CoinPaymentReportRow[] = result.data.map((row: any) => ({
      id: row.id,
      date: row.date.toISOString(),
      pg_order_id: row.pg_order_id || `ORDER-${row.id}`,
      client_name: row.client_name || 'Unknown',
      client_email: row.client_email || 'Unknown',
      coin_amount: Number(row.coin_amount),
      coin_price: Number(row.coin_price ?? 0),
      tax_amount: Number(row.tax_amount ?? 0),
      gateway_fee: Number(row.gateway_fee ?? 0),
      price_paid: Number(row.price_paid ?? 0),
      payment_method: row.payment_method || 'Unknown',
      payment_channel: row.payment_channel || '',
    }));

    if (filters.page && filters.limit) {
      const paginated = paginate(formattedData, result.total, filters.page, filters.limit);
      return { data: paginated.data, total: result.total, meta: paginated.meta };
    }

    return { data: formattedData, total: result.total };
  }

  async getCoinPaymentByMethod(filters: TransactionReportFilters) {
    const { start, end } = this.normalizeDateRange(filters.startDate, filters.endDate);

    const rows = await this.coinTransactionRepository.getPaymentReportByMethod({
      startDate: start,
      endDate: end,
      paymentMethodId: filters.paymentMethodId,
    });

    return rows.map((row: any) => ({
      payment_method_id: row.payment_method_id,
      payment_method: row.payment_method || 'Unknown',
      total_orders: Number(row.total_orders),
      total_coin_price: Number(row.total_coin_price || 0),
      total_tax_amount: Number(row.total_tax_amount || 0),
      total_gateway_fee: Number(row.total_gateway_fee || 0),
      total_price_paid: Number(row.total_price_paid || 0),
    }));
  }

  async getCoinPaymentChart(filters: TransactionReportFilters) {
    const { start, end } = this.normalizeDateRange(filters.startDate, filters.endDate);

    // Same dynamic bucketing as getChartReport: day (<=30d), week (<=90d), month (>90d).
    let interval: 'day' | 'week' | 'month' = 'day';
    if (start && end) {
      const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 90) interval = 'month';
      else if (diffDays > 30) interval = 'week';
    }

    const rawData = await this.coinTransactionRepository.getPaymentReportChart({
      startDate: start,
      endDate: end,
      paymentMethodId: filters.paymentMethodId,
      interval,
    });

    const results = rawData.map((row: any) => {
      const rowDate = row.date instanceof Date ? row.date : new Date(row.date);
      let dateString = rowDate.toISOString().split('T')[0];
      if (interval === 'month') dateString = dateString.substring(0, 7);

      return {
        date: dateString,
        total_orders: Number(row.total_orders),
        total_coin_price: Number(row.total_coin_price || 0),
        total_tax_amount: Number(row.total_tax_amount || 0),
        total_gateway_fee: Number(row.total_gateway_fee || 0),
        total_price_paid: Number(row.total_price_paid || 0),
      };
    });

    return { interval, results };
  }

  generateCoinPaymentCSV(reportRows: CoinPaymentReportRow[]): string {
    const headers = [
      'Date',
      'PG Order ID',
      'Client Name',
      'Client Email',
      'Coin Amount',
      'Coin Price (Base)',
      'Tax Amount',
      'Gateway Fee',
      'Total Paid',
      'Payment Method',
      'Payment Channel',
    ];

    const keys: (keyof CoinPaymentReportRow)[] = [
      'date',
      'pg_order_id',
      'client_name',
      'client_email',
      'coin_amount',
      'coin_price',
      'tax_amount',
      'gateway_fee',
      'price_paid',
      'payment_method',
      'payment_channel',
    ];

    const csvRows = [headers.join(',')];
    for (const row of reportRows) {
      const values = keys.map((key) => {
        const val = row[key];
        const escaped = ('' + (val !== null && val !== undefined ? val : '')).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  generateCSV(reportRows: FormattedReportRow[]): string {
    const headers = [
      'Date',
      'PG Order ID',
      'Client Name',
      'Client Email',
      'Coin Amount',
      'Coin Price (Base)',
      'Tax Amount',
      'Gateway Fee',
      'Total Paid',
      'Payment Method',
      'Status',
    ];

    const keys: (keyof FormattedReportRow)[] = [
      'date',
      'pg_order_id',
      'client_name',
      'client_email',
      'coin_amount',
      'coin_price',
      'tax_amount',
      'gateway_fee',
      'price_paid',
      'payment_method',
      'status',
    ];

    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of reportRows) {
      const values = keys.map((key) => {
        const val = row[key];
        const escaped = ('' + (val !== null && val !== undefined ? val : '')).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}
