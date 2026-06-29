import { PaginationMeta } from '../types/pagination.types';

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export const successResponse = <T>(
  data: T,
  meta?: SuccessResponse<T>['meta'],
): SuccessResponse<T> => {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
};

export const errorResponse = (code: string, message: string, details?: unknown): ErrorResponse => {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
};
