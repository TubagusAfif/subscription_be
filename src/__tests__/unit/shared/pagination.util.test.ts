import { paginate } from '../../../shared/utils/pagination.util';

describe('paginate', () => {
  const items = ['a', 'b', 'c'];

  it('should compute totalPages correctly', () => {
    const result = paginate(items, 25, 1, 10);

    expect(result.meta.total_pages).toBe(3);
  });

  it('should set has_prev_page to false on first page', () => {
    const result = paginate(items, 25, 1, 10);

    expect(result.meta.has_prev_page).toBe(false);
  });

  it('should set has_next_page to true when more pages exist', () => {
    const result = paginate(items, 25, 1, 10);

    expect(result.meta.has_next_page).toBe(true);
  });

  it('should set has_prev_page to true on page > 1', () => {
    const result = paginate(items, 25, 2, 10);

    expect(result.meta.has_prev_page).toBe(true);
  });

  it('should set has_next_page to false on last page', () => {
    const result = paginate(items, 25, 3, 10);

    expect(result.meta.has_next_page).toBe(false);
  });

  it('should set both false when only one page exists', () => {
    const result = paginate(items, 3, 1, 10);

    expect(result.meta.has_prev_page).toBe(false);
    expect(result.meta.has_next_page).toBe(false);
    expect(result.meta.total_pages).toBe(1);
  });

  it('should pass through data, total, page, and limit', () => {
    const result = paginate(items, 25, 2, 10);

    expect(result.data).toEqual(items);
    expect(result.meta.total).toBe(25);
    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(10);
  });

  it('should handle empty data with total 0', () => {
    const result = paginate([], 0, 1, 10);

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
    expect(result.meta.total_pages).toBe(0);
    expect(result.meta.has_prev_page).toBe(false);
    expect(result.meta.has_next_page).toBe(false);
  });
});
