export type DateRange = {
  from?: Date;
  to?: Date;
};

export function parseDateRange(search: URLSearchParams): DateRange {
  const range = search.get("range") || "30d";

  if (range === "custom") {
    const from = search.get("from");
    const to = search.get("to");
    return {
      from: from ? new Date(`${from}T00:00:00.000`) : undefined,
      to: to ? new Date(`${to}T23:59:59.999`) : undefined,
    };
  }

  const days = range === "1d" ? 1 : range === "7d" ? 7 : 30;
  const to = new Date();
  return {
    from: new Date(to.getTime() - days * 24 * 60 * 60 * 1000),
    to,
  };
}

export function savedAtFilter(range?: DateRange) {
  if (!range?.from && !range?.to) return {};
  const saved_at: { $gte?: Date; $lte?: Date } = {};
  if (range.from) saved_at.$gte = range.from;
  if (range.to) saved_at.$lte = range.to;
  return { saved_at };
}
