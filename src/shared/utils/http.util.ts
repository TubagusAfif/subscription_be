import { logger } from '../config/logger';

export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Wraps native fetch with an AbortController timeout.
 *
 * @param url The URL to fetch.
 * @param options Fetch options including timeoutMs (default: 30000ms).
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const { timeoutMs = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: any) => boolean;
}

/**
 * Wraps an asynchronous operation with exponential backoff retry logic.
 *
 * @param operation The async function to execute. Receives the attempt number.
 * @param options Configuration for max retries, delays, and a custom shouldRetry predicate.
 */
export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 8000,
    shouldRetry = () => true,
  } = options;

  let lastError: Error = new Error('Operation failed');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!shouldRetry(error)) {
        throw lastError; // Bubble up immediately if non-retryable
      }

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        logger.warn(`[http.util] Operation failed, retrying after delay`, {
          attempt,
          delayMs: delay,
          error: lastError.message,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error('[http.util] All retries exhausted', { maxRetries });
  throw lastError;
}
