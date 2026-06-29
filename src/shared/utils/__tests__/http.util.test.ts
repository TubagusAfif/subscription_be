import { fetchWithTimeout, withRetry } from '../http.util';

// Mock the global fetch
const originalFetch = global.fetch;

describe('HTTP Utility', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('fetchWithTimeout', () => {
    it('should resolve successfully before timeout', async () => {
      global.fetch = jest.fn().mockResolvedValue(new Response('ok'));
      const response = await fetchWithTimeout('http://example.com', { timeoutMs: 1000 });
      expect(await response.text()).toBe('ok');
    });

    it('should abort after the configured timeout', async () => {
      global.fetch = jest.fn().mockImplementation((url, options) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => resolve(new Response('ok')), 200);
          options.signal.addEventListener('abort', () => reject(new Error('AbortError')));
        });
      });

      await expect(fetchWithTimeout('http://example.com', { timeoutMs: 50 })).rejects.toThrow(
        'AbortError',
      );
    });
  });

  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await withRetry(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await withRetry(operation, { baseDelayMs: 10 });
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw if max retries exceeded', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('always fail'));

      await expect(withRetry(operation, { maxRetries: 2, baseDelayMs: 10 })).rejects.toThrow(
        'always fail',
      );
      expect(operation).toHaveBeenCalledTimes(2); // 1 initial + 1 retry if maxRetries is 2
    });
  });
});
