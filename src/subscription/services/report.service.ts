import { CoinOrderRepository } from '../../client/repositories/coin-order.repository';
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

export class ReportService {
  constructor(private readonly coinOrderRepository: CoinOrderRepository) {}

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

    const rawData = await this.coinOrderRepository.getChartReport({
      startDate,
      endDate,
      paymentMethodId: filters.paymentMethodId,
      status,
    });

    const formattedData = rawData.map(row => ({
      date: row.date.toISOString().split('T')[0],
      total_orders: Number(row.total_orders),
      total_coin_price: Number(row.total_coin_price || 0),
      total_tax_amount: Number(row.total_tax_amount || 0),
      total_gateway_fee: Number(row.total_gateway_fee || 0),
      total_price_paid: Number(row.total_price_paid || 0),
    }));

    return formattedData;
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
