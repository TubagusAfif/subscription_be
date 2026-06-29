import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { webhookAuthMiddleware } from '../../../shared/middlewares/webhook-auth.middleware';
import { env } from '../../../shared/config/env';

jest.mock('../../../shared/config/env', () => ({
  env: {
    WEBHOOK_SHARED_SECRET: 'test-secret',
  },
}));

describe('webhookAuthMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      header: jest.fn(),
      body: Buffer.from('{"test":"data"}'),
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.useFakeTimers().setSystemTime(new Date('2026-06-03T00:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const getValidSignature = (payload: string, secret: string) => {
    return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  };

  it('should return 401 if headers are missing', () => {
    (req.header as jest.Mock).mockReturnValue(undefined);

    webhookAuthMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing required webhook headers',
      data: null,
      error_code: 'UNAUTHORIZED',
    });
  });

  it('should return 401 if timestamp is invalid', () => {
    (req.header as jest.Mock).mockImplementation((name) => {
      if (name === 'x-webhook-signature') return 'some-sig';
      if (name === 'x-webhook-timestamp') return 'invalid-time';
      return undefined;
    });

    webhookAuthMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid timestamp format',
      data: null,
      error_code: 'UNAUTHORIZED',
    });
  });

  it('should return 401 if timestamp drift exceeds 5 minutes', () => {
    (req.header as jest.Mock).mockImplementation((name) => {
      if (name === 'x-webhook-signature') return 'some-sig';
      if (name === 'x-webhook-timestamp') return Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
      return undefined;
    });

    webhookAuthMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Webhook timestamp drift exceeded 5 minutes',
      }),
    );
  });

  it('should return 500 if req.body is already parsed (not Buffer or string)', () => {
    req.body = { test: 'data' }; // parsed object with keys
    const validTime = Math.floor(Date.now() / 1000);
    (req.header as jest.Mock).mockImplementation((name) => {
      if (name === 'x-webhook-signature') return 'some-sig';
      if (name === 'x-webhook-timestamp') return validTime;
      return undefined;
    });

    webhookAuthMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Internal error: webhook route must use express.raw() middleware',
      }),
    );
  });

  it('should return 401 if signature is invalid', () => {
    const validTime = Math.floor(Date.now() / 1000);
    (req.header as jest.Mock).mockImplementation((name) => {
      if (name === 'x-webhook-signature') return 'sha256=invalid-signature';
      if (name === 'x-webhook-timestamp') return validTime;
      return undefined;
    });

    webhookAuthMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid webhook signature',
      }),
    );
  });

  it('should return 422 if body is invalid JSON', () => {
    req.body = Buffer.from('invalid-json');
    const validTime = Math.floor(Date.now() / 1000);
    const sig = getValidSignature('invalid-json', env.WEBHOOK_SHARED_SECRET);

    (req.header as jest.Mock).mockImplementation((name) => {
      if (name === 'x-webhook-signature') return sig;
      if (name === 'x-webhook-timestamp') return validTime;
      return undefined;
    });

    webhookAuthMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid JSON payload',
        error_code: 'UNPROCESSABLE_ENTITY',
      }),
    );
  });

  it('should call next and parse body if everything is valid (Buffer body)', () => {
    const validTime = Math.floor(Date.now() / 1000);
    const bodyStr = '{"test":"data"}';
    req.body = Buffer.from(bodyStr);
    const sig = getValidSignature(bodyStr, env.WEBHOOK_SHARED_SECRET);

    (req.header as jest.Mock).mockImplementation((name) => {
      if (name === 'x-webhook-signature') return sig;
      if (name === 'x-webhook-timestamp') return validTime;
      return undefined;
    });

    webhookAuthMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ test: 'data' });
  });

  it('should call next and parse body if everything is valid (String body)', () => {
    const validTime = Math.floor(Date.now() / 1000);
    const bodyStr = '{"test":"data"}';
    req.body = bodyStr;
    const sig = getValidSignature(bodyStr, env.WEBHOOK_SHARED_SECRET);

    (req.header as jest.Mock).mockImplementation((name) => {
      if (name === 'x-webhook-signature') return sig;
      if (name === 'x-webhook-timestamp') return validTime;
      return undefined;
    });

    webhookAuthMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ test: 'data' });
  });
});
