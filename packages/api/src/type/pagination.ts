export interface Pagination<T> {
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  cursor: string | null;
  items: T[];
}
