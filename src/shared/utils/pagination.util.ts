import { PaginatedResult } from '../types/pagination.types';

export const paginate = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> => {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      total_pages: totalPages,
      has_prev_page: page > 1,
      has_next_page: page < totalPages,
    },
  };
};
