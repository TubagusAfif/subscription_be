import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * IP Whitelist Middleware (factory).
 *
 * Restricts access to a route/router to a fixed set of client IPs.
 *
 * Pass `null` (or an empty list) to allow every IP — the middleware becomes a
 * transparent pass-through. This is the default when no whitelist is configured
 * via env, so access is unrestricted unless an operator opts in.
 *
 * Relies on `app.set('trust proxy', ...)` being configured (see app.ts) so that
 * `req.ip` reflects the real client IP behind the platform proxy rather than the
 * proxy's own address.
 */

// Normalise IPv4-mapped IPv6 addresses (e.g. "::ffff:1.2.3.4" -> "1.2.3.4") so
// operators can whitelist plain IPv4 addresses without surprises.
const normalizeIp = (ip: string): string => ip.replace(/^::ffff:/, '');

export const createIpWhitelist = (whitelist: string[] | null) => {
  // No whitelist configured — allow all IPs.
  if (!whitelist || whitelist.length === 0) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  const allowed = new Set(whitelist.map(normalizeIp));

  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip ? normalizeIp(req.ip) : undefined;

    if (clientIp && allowed.has(clientIp)) {
      return next();
    }

    logger.warn('[IpWhitelist] Blocked request from non-whitelisted IP', {
      ip: clientIp,
      path: req.originalUrl,
    });

    return res.status(403).json({
      success: false,
      message: 'Forbidden: your IP is not allowed to access this resource',
      data: null,
      error_code: 'FORBIDDEN',
    });
  };
};
