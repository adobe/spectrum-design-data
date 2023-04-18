export async function settledValues(...promises: any[]): Promise<any[]> {
  const results = await Promise.allSettled(promises);
  const values = (results as PromiseFulfilledResult<any>[]).map(
    (result) => result.value,
  );
  return values;
}
