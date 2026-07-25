export function buildDateFilter(startDate?: string, endDate?: string) {
  const filter: { $gte?: Date; $lte?: Date } = {};
  if (startDate) filter.$gte = new Date(startDate);
  if (endDate) filter.$lte = new Date(endDate);
  return Object.keys(filter).length > 0 ? filter : undefined;
}

export function buildOverlapFilter(startDate?: string, endDate?: string) {
  return {
    ...(endDate ? { startDate: { $lte: new Date(endDate) } } : {}),
    ...(startDate ? { endDate: { $gte: new Date(startDate) } } : {}),
  };
}
