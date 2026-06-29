import { Router } from 'express';
import { CronController } from '../controllers/cron.controller';
import express from 'express';

export const createCronRouter = (cronController: CronController): Router => {
  const router = Router();

  router.use(express.json());

  // Endpoint to be triggered by GitHub Actions
  router.post('/daily-expiry', cronController.triggerDailyExpiry);

  return router;
};
