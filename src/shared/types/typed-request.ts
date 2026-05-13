import { Request } from 'express';
import { JWTPayload } from '../services/token.service';

/**
 * Typed request for routes behind the `authenticate` middleware.
 *
 * `req.user` is always typed as `JWTPayload` (guaranteed by authenticate middleware).
 *
 * Optionally pass a body type to get `req.body` autocomplete:
 *
 *   // No body — req.body is `any`
 *   handler = async (req: AuthenticatedRequest, res, next) => { ... }
 *
 *   // With body — req.body is fully typed
 *   handler = async (req: AuthenticatedRequest<CreateTaxBody>, res, next) => {
 *     req.body.tax_name;  // ✅ autocomplete
 *     req.user.sub;       // ✅ autocomplete
 *   }
 */
export interface AuthenticatedRequest<TBody = any> extends Request {
  user: JWTPayload;
  body: TBody;
}
