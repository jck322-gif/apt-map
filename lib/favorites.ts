// 즐겨찾기 — 회원가입 없이 "이 브라우저"에만 저장하는 방식입니다.
//
// 서버(DB)에는 아무것도 저장하지 않고, 방문자의 브라우저(localStorage)에만 남습니다.
// 그래서 로그인이 필요 없고, 개인정보를 서버에 모을 필요도 없습니다.
// 대신 같은 기기·같은 브라우저에서만 보이고, 브라우저 데이터를 지우면 사라집니다.

export type FavoriteItem = {
  /** complexHref(code, complex) 값. 즐겨찾기 항목의 고유 키로 씁니다. */
  href: string;
  code: string;
  complex: string;
  regionName: string;
  group: string;
  /** 저장한 시각 (정렬용) */
  savedAt: number;
};

const STORAGE_KEY = "buulapt:favorites:v1";
/** 다른 컴포넌트(별표 버튼, 헤더 뱃지 등)에 "즐겨찾기가 바뀌었다"고 알리는 이벤트 이름 */
const CHANGE_EVENT = "buulapt:favorites:changed";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getFavorites(): FavoriteItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is FavoriteItem =>
        v && typeof v === "object" && typeof v.href === "string" && typeof v.complex === "string"
    );
  } catch {
    // 시크릿 모드 등에서 localStorage 접근이 막혀 있으면 그냥 빈 목록으로 취급합니다.
    return [];
  }
}

function save(list: FavoriteItem[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // 저장 공간이 꽉 찼거나 접근이 막힌 경우. 조용히 무시합니다.
  }
}

export function isFavorite(href: string): boolean {
  return getFavorites().some((f) => f.href === href);
}

export function addFavorite(item: Omit<FavoriteItem, "savedAt">) {
  const list = getFavorites().filter((f) => f.href !== item.href);
  list.unshift({ ...item, savedAt: Date.now() });
  save(list);
}

export function removeFavorite(href: string) {
  save(getFavorites().filter((f) => f.href !== href));
}

export function toggleFavorite(item: Omit<FavoriteItem, "savedAt">): boolean {
  const nowFavorite = !isFavorite(item.href);
  if (nowFavorite) addFavorite(item);
  else removeFavorite(item.href);
  return nowFavorite;
}

/** 즐겨찾기가 바뀔 때마다 콜백을 호출합니다. (다른 탭·다른 컴포넌트에서 바뀐 것도 반영) */
export function subscribeFavorites(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = () => cb();
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler); // 다른 탭에서 바뀐 경우
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
