import type { SortDirection } from "./types";

export function sortBy<T>(items: T[], key: keyof T, direction: SortDirection) {
  const sorted = [...items].sort((a, b) => {
    const av = toComparable((a as Record<string, unknown>)[String(key)]);
    const bv = toComparable((b as Record<string, unknown>)[String(key)]);
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  });
  return direction === "asc" ? sorted : sorted.reverse();
}

function toComparable(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  return String(value).toLowerCase();
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), totalPages };
}
