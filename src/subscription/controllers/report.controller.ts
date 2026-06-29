import { Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service';
import { successResponse } from '../../shared/utils/response.util';
import type { AuthenticatedRequest } from '../../shared/types/typed-request';

export interface ReportControllerDeps {
  reportService: ReportService;
}

export class ReportController {
  private readonly reportService: ReportService;

  constructor(deps: ReportControllerDeps) {
    this.reportService = deps.reportService;
  }

  getTransactionReport = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const startDate = req.query.start_date as string | undefined;
      const endDate = req.query.end_date as string | undefined;
      const paymentMethodId = req.query.payment_method_id
        ? parseInt(req.query.payment_method_id as string, 10)
        : undefined;
      const status = req.query.status as string | undefined;
      const format = (req.query.format as string | undefined)?.toLowerCase();

      // If formatting as CSV, don't paginate so the user downloads the entire filtered set of data
      const isCSV = format === 'csv';
      const page = isCSV ? undefined : req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = isCSV
        ? undefined
        : req.query.limit
          ? parseInt(req.query.limit as string, 10)
          : 10;

      const reportResult = await this.reportService.getTransactionReport({
        startDate,
        endDate,
        paymentMethodId,
        status,
        page,
        limit,
      });

      if (isCSV) {
        const csvContent = this.reportService.generateCSV(reportResult.data);
        const filename = `transaction-report-${new Date().toISOString().split('T')[0]}.csv`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.status(200).send(csvContent);
        return;
      }

      res.status(200).json(successResponse(reportResult.data, reportResult.meta));
    } catch (error) {
      next(error);
    }
  };
  getChartReport = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const startDate = req.query.start_date as string | undefined;
      const endDate = req.query.end_date as string | undefined;
      const paymentMethodId = req.query.payment_method_id
        ? parseInt(req.query.payment_method_id as string, 10)
        : undefined;
      const status = req.query.status as string | undefined;

      const data = await this.reportService.getChartReport({
        startDate,
        endDate,
        paymentMethodId,
        status,
      });

      res.status(200).json(successResponse(data));
    } catch (error) {
      next(error);
    }
  };

  // ── Coin-payment report (transaction-based, by payment method) ──

  getCoinPaymentReport = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const startDate = req.query.start_date as string | undefined;
      const endDate = req.query.end_date as string | undefined;
      const paymentMethodId = req.query.payment_method_id
        ? parseInt(req.query.payment_method_id as string, 10)
        : undefined;
      const format = (req.query.format as string | undefined)?.toLowerCase();

      // CSV downloads the entire filtered set, so skip pagination.
      const isCSV = format === 'csv';
      const page = isCSV ? undefined : req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = isCSV
        ? undefined
        : req.query.limit
          ? parseInt(req.query.limit as string, 10)
          : 10;

      const reportResult = await this.reportService.getCoinPaymentReport({
        startDate,
        endDate,
        paymentMethodId,
        page,
        limit,
      });

      if (isCSV) {
        const csvContent = this.reportService.generateCoinPaymentCSV(reportResult.data);
        const filename = `coin-payment-report-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.status(200).send(csvContent);
        return;
      }

      res.status(200).json(successResponse(reportResult.data, reportResult.meta));
    } catch (error) {
      next(error);
    }
  };

  getCoinPaymentByMethod = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const startDate = req.query.start_date as string | undefined;
      const endDate = req.query.end_date as string | undefined;
      const paymentMethodId = req.query.payment_method_id
        ? parseInt(req.query.payment_method_id as string, 10)
        : undefined;

      const data = await this.reportService.getCoinPaymentByMethod({
        startDate,
        endDate,
        paymentMethodId,
      });

      res.status(200).json(successResponse(data));
    } catch (error) {
      next(error);
    }
  };

  getCoinPaymentChart = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const startDate = req.query.start_date as string | undefined;
      const endDate = req.query.end_date as string | undefined;
      const paymentMethodId = req.query.payment_method_id
        ? parseInt(req.query.payment_method_id as string, 10)
        : undefined;

      const data = await this.reportService.getCoinPaymentChart({
        startDate,
        endDate,
        paymentMethodId,
      });

      res.status(200).json(successResponse(data));
    } catch (error) {
      next(error);
    }
  };
}
