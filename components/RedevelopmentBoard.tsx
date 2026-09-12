"use client";

import { useEffect, useState } from "react";
import {
  STAGE_ORDER,
  redevelopmentSearchLinks,
  type RedevelopmentEntry,
  type RedevelopmentStage,
} from "@/lib/redevelopment";
import RedevelopmentMap, { STAGE_COLOR } from "@/components/RedevelopmentMap";

type Entry = RedevelopmentEntry & { href: string };

// 단계 이름이 길어서 필터 칩·진행 트랙에 그대로 쓰면 줄바꿈이 잦습니다. 짧은 이름만 여기서 씁니다.
const SHORT_LABEL: Record<RedevelopmentStage, string> = {
  기본계획: "기본",
  구역지정: "구역",
  추진위원회: "추진위",
  조합설립: "조합",
  사업시행인가: "시행",
  관리처분인가: "관리",
  착공: "착공",
  준공: "준공",
};

function StageTrack({ stage, size = "sm" }: { stage?: RedevelopmentStage; size?: "sm" | "lg" }) {
  const idx = stage ? STAGE_ORDER.findIndex((s) => s.stage === stage) : -1;
  return (
    <div className={`stage-track stage-track-${size}`}>
      {STAGE_ORDER.map((s, i) => (
        <div className="stage-track-step" key={s.stage}>
          <span
            className={`stage-track-dot${i < idx ? " is-done" : ""}${i === idx ? " is-current" : ""}`}
            aria-hidden="true"
          />
          <span className={`stage-track-label${i === idx ? " is-current" : ""}`}>{SHORT_LABEL[s.stage]}</span>
        </div>
      ))}
    </div>
  );
}

export default function RedevelopmentBoard({ entries }: { entries: Entry[] }) {
  const [filter, setFilter] = useState<RedevelopmentStage | "all">("all");
  const [selected, setSelected] = useState<Entry | null>(null);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [selected]);

  const filtered = entries.filter((e) => filter === "all" || e.stage === filter);
  const busan = filtered.filter((e) => e.group === "부산");
  const ulsan = filtered.filter((e) => e.group === "울산");

  return (
    <>
      <div className="redev-filter">
        <span className="redev-filter-title">단계별 필터</span>
        <div className="redev-filter-chips">
          <button
            type="button"
            className={`redev-chip${filter === "all" ? " is-active" : ""}`}
            onClick={() => setFilter("all")}
          >
            전체
          </button>
          {STAGE_ORDER.map((s) => (
            <button
              key={s.stage}
              type="button"
              className={`redev-chip${filter === s.stage ? " is-active" : ""}`}
              onClick={() => setFilter(s.stage)}
            >
              {s.stage}
            </button>
          ))}
        </div>
      </div>

      {filter !== "all" && (
        <p className="redev-filter-desc">
          <strong>{filter}</strong> — {STAGE_ORDER.find((s) => s.stage === filter)?.desc}
        </p>
      )}

      <p className="redev-count">{filtered.length}개 구역</p>

      <RedevelopmentMap entries={filtered} onSelect={(e) => setSelected(e as Entry)} />

      {[
        { title: "부산광역시", list: busan },
        { title: "울산광역시", list: ulsan },
      ].map(
        (g) =>
          g.list.length > 0 && (
            <section className="brief-section" key={g.title}>
              <h2 className="brief-h2">
                {g.title} <span className="brief-count">{g.list.length}개 구역</span>
              </h2>
              <div className="redev-list">
                {g.list.map((e) => (
                  <button
                    type="button"
                    className="redev-card redev-card-btn"
                    key={`${e.regionCode}-${e.name}`}
                    onClick={() => setSelected(e)}
                  >
                    <div className="redev-card-head">
                      <span className="redev-card-name">{e.name}</span>
                      <span className="redev-card-type">{e.type}</span>
                      {e.stage && (
                        <span className="redev-stage-badge" style={{ background: STAGE_COLOR[e.stage] }}>
                          {e.stage}
                        </span>
                      )}
                      <span className="redev-card-loc">{e.regionName}</span>
                    </div>
                    <StageTrack stage={e.stage} />
                    <p className="redev-card-stage">
                      {e.stage ? (
                        <>
                          현재 단계 <strong>{e.stage}</strong>
                          {e.lastChecked && <span className="redev-card-checked"> · {e.lastChecked} 확인</span>}
                        </>
                      ) : (
                        <span className="redev-card-stage-unknown">현재 단계는 확인이 필요합니다</span>
                      )}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )
      )}

      {filtered.length === 0 && (
        <p className="section-note" style={{ marginTop: 16 }}>
          이 단계에 해당하는 구역이 아직 없습니다.
        </p>
      )}

      {selected && (
        <div className="redev-modal-overlay" onClick={() => setSelected(null)}>
          <div className="redev-modal" onClick={(e) => e.stopPropagation()}>
            <div className="redev-modal-head">
              <div>
                <span className="redev-card-name">{selected.name}</span>{" "}
                <span className="redev-card-type">{selected.type}</span>
              </div>
              <button
                type="button"
                className="redev-modal-close"
                onClick={() => setSelected(null)}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <p className="redev-card-loc" style={{ marginBottom: 10 }}>
              {selected.group} {selected.regionName}
            </p>

            <StageTrack stage={selected.stage} size="lg" />

            <p className="redev-card-stage" style={{ margin: "10px 0" }}>
              {selected.stage ? (
                <>
                  현재 단계 <strong>{selected.stage}</strong>
                  {selected.lastChecked && (
                    <span className="redev-card-checked"> · {selected.lastChecked} 확인</span>
                  )}
                </>
              ) : (
                <span className="redev-card-stage-unknown">현재 단계는 공식 페이지에서 확인해주세요</span>
              )}
            </p>

            {(selected.totalHouseholds || selected.builder) && (
              <div className="redev-modal-facts">
                {selected.totalHouseholds && (
                  <div className="redev-modal-fact">
                    <span className="redev-modal-fact-label">총 세대수</span>
                    <span className="redev-modal-fact-value">{selected.totalHouseholds.toLocaleString()}세대</span>
                  </div>
                )}
                {selected.builder && (
                  <div className="redev-modal-fact">
                    <span className="redev-modal-fact-label">시공사</span>
                    <span className="redev-modal-fact-value">{selected.builder}</span>
                  </div>
                )}
              </div>
            )}

            {selected.note && <p className="redev-card-note">{selected.note}</p>}

            {selected.history && selected.history.length > 0 && (
              <div className="redev-modal-history">
                <span className="redev-modal-history-title">주요 이력</span>
                <ul className="redev-modal-history-list">
                  {selected.history.map((h, i) => (
                    <li key={i} className="redev-modal-history-item">
                      <span className="redev-modal-history-date">{h.date}</span>
                      <span className="redev-modal-history-label">{h.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="redev-modal-links">
              <a href={selected.officialUrl} target="_blank" rel="noopener noreferrer" className="redev-modal-btn">
                부산시 공식 정보 보기 ↗
              </a>
              {redevelopmentSearchLinks(selected.name, selected.type).map((l) => (
                <a
                  key={l.label}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="redev-modal-btn redev-modal-btn-outline"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
