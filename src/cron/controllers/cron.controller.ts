import { Request, Response } from 'express';
import { DailyExpiryService } from '../services/daily-expiry.service';
import { logger } from '../../shared/config/logger';

export class CronController {
  constructor(private readonly dailyExpiryService: DailyExpiryService) {}

  public triggerDailyExpiry = async (req: Request, res: Response): Promise<void> => {
    // Basic security: require a secret token in the header
    const authHeader = req.headers['authorization'];
    const expectedToken = process.env.CRON_SECRET || 'default_cron_secret';

    if (
      authHeader !== `Bearer ${expectedToken}` &&
      req.headers['x-cron-secret'] !== expectedToken
    ) {
      logger.warn('[CronController] Unauthorized attempt to trigger daily expiry sweep');
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    try {
      await this.dailyExpiryService.runDailyExpirySweep();
      res.status(200).json({ message: 'Daily expiry sweep completed successfully' });
    } catch (error) {
      logger.error('[CronController] Error running daily expiry sweep', { error });
      res.status(500).json({ message: 'Internal Server Error' });
    }
  };
}
