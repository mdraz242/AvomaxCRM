export function parsePagination(query = {}, defaults = { page: 1, limit: 20, maxLimit: 100 }) {
  const page = Math.max(1, parseInt(query.page, 10) || defaults.page);
  const requestedLimit = parseInt(query.limit, 10) || defaults.limit;
  const limit = Math.min(Math.max(1, requestedLimit), defaults.maxLimit);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return { page, limit, from, to };
}

export function buildPaginationMeta({ total = 0, page = 1, limit = 20 }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

