/**
 * Supabase(PostgREST)는 한 번에 최대 1000행까지만 돌려줍니다. limit(5000)을 줘도 조용히 1000행에서
 * 잘리기 때문에, 행이 많을 수 있는 조회는 이 함수로 나눠 받습니다.
 *
 * makeQuery(from, to)는 매번 **새** 쿼리를 만들어 .range(from, to)까지 붙여 돌려줘야 합니다.
 * 순서가 고정돼야 페이지끼리 겹치거나 빠지지 않으므로, 쿼리에 order("id")처럼 유일한 정렬을 넣으세요.
 */
const PAGE = 1000;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

export async function fetchAll<T>(
  makeQuery: (from: number, to: number) => PageResult<T>,
  opts: { hardCap?: number; parallel?: number } = {}
): Promise<T[]> {
  const hardCap = opts.hardCap ?? 60000;
  const parallel = opts.parallel ?? 4;
  const out: T[] = [];
  for (let start = 0; start < hardCap; start += PAGE * parallel) {
    const batch = await Promise.all(
      Array.from({ length: parallel }, (_, i) => {
        const from = start + i * PAGE;
        return makeQuery(from, from + PAGE - 1);
      })
    );
    let done = false;
    for (const { data, error } of batch) {
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      out.push(...rows);
      if (rows.length < PAGE) done = true;
    }
    if (done) break;
  }
  return out;
}
