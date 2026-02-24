import uFuzzy from "@leeoniya/ufuzzy";

export function fuzzySearch(
  searchInputValue: string,
  headers: string[],
): string[] {
  const uf = new uFuzzy({});
  // Pre-filter
  const idxs = uf.filter(headers, searchInputValue);

  if (idxs != null && idxs.length > 0) {
    const info = uf.info(idxs, headers, searchInputValue);
    const order = uf.sort(info, headers, searchInputValue);
    const result = [];
    for (let i = 0; i < order.length; i++) {
      result.push(headers[idxs[i]]);
    }
    return result;
  } else {
    return [];
  }
}
