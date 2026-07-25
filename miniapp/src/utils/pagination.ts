interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pages: number;
  };
}

export async function collectAllPages<T>(
  fetchPage: (page: number) => Promise<PaginatedResult<T>>
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;

  while (true) {
    const result = await fetchPage(page);
    items.push(...(result.data || []));
    if (page >= result.pagination.pages) return items;
    page += 1;
  }
}
