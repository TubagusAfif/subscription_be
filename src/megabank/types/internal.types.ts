export type HttpMethod = 'GET' | 'POST';

export interface ErrorContext {
  code: string;
  message: string;
}

/** Response shape from the B2B access-token endpoint. */
export interface AccessTokenResponse {
  responseCode: string;
  responseMessage: string;
  accessToken: string;
  tokenType: string;
  expiresIn: string; // seconds as string
}

/** In-memory cached access token with its absolute expiry. */
export interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}
