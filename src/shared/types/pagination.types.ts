export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_prev_page: boolean;
  has_next_page: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
