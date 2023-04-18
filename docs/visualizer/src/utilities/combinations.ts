function _combinations([head, ...[headTail, ...tailTail]]: any[]): any[] {
  if (!headTail) return head;
  const combined = headTail.reduce((acc: any, x: any) => {
    x = typeof x === "number" ? [x] : x;
    return acc.concat(
      head.map((h: any) => {
        h = typeof h === "number" ? [h] : h;
        return [...h, ...x];
      }),
    );
  }, []);
  return _combinations([combined, ...tailTail]);
}

export function combinations(arrays: any[]): any[] {
  const indexIncrArrays = arrays.map((arr: any) => [
    ...Array(arr.length).keys(),
  ]);
  const indexCombinations = _combinations(indexIncrArrays);
  const valueResults = indexCombinations.map((arr: any) => {
    return arr.map((element: number, index: number) => arrays[index][element]);
  });
  return valueResults;
}
