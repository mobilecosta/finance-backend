export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  hasNext: boolean;
}

export function parsePagination(query: Record<string, any>, defaultPageSize = 20): PaginationParams {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string) || defaultPageSize));
  const skip = (page - 1) * pageSize;

  return { page, pageSize, skip };
}

export function paginatedResponse<T>(items: T[], total: number, pageSize: number, skip: number): PaginatedResponse<T> {
  return {
    items,
    hasNext: skip + items.length < total,
  };
}
