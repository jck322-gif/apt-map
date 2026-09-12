import { getInteriorLinks, interiorSearchLinks } from "@/lib/interiorLinks";

/**
 * 단지 상세 페이지의 "내부 구조 · 인테리어 참고" 섹션.
 *
 * 사진·글을 이 사이트로 옮겨오지 않고, 원문으로 바로 연결만 합니다. 미리 찾아둔 자료가
 * 있으면 그 목록을, 없어도 유튜브·네이버 검색으로 바로 갈 수 있는 버튼은 항상 보여줍니다.
 */
export default function InteriorLinks({ complex }: { complex: string }) {
  const curated = getInteriorLinks(complex);
  const searchLinks = interiorSearchLinks(complex);

  return (
    <section className="brief-section">
      <h2 className="brief-h2">내부 구조 · 인테리어 참고</h2>
      <p className="section-note" style={{ margin: "0 0 10px" }}>
        사진·글은 옮겨오지 않고, 원문으로 바로 연결합니다. 출처를 직접 확인해보세요.
      </p>

      {curated.length > 0 && (
        <ul className="interior-list">
          {curated.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="interior-link">
                <span className="interior-badge">{l.source}</span>
                {l.title}
                <span aria-hidden="true" className="interior-go">
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="interior-search-row">
        {searchLinks.map((s) => (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="interior-search-btn"
          >
            {complex} {s.label} ↗
          </a>
        ))}
      </div>
    </section>
  );
}
