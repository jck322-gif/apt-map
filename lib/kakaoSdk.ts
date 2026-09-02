/**
 * 카카오 지도 SDK 로더.
 *
 * 한 화면에 지도가 여러 개(부산·울산) 뜨기 때문에, 스크립트는 페이지 전체에서 딱 한 번만
 * 넣고 모든 지도가 같은 로딩 완료를 기다리도록 모듈 스코프에서 약속(Promise)을 공유합니다.
 * (이렇게 하지 않으면 두 번째 지도가 초기화되지 않습니다.)
 *
 * `libraries=services`는 주소 → 좌표 변환(지오코딩)에 필요합니다.
 * 실거래 지도에서 "부산광역시 동래구 안락동" 같은 주소를 좌표로 바꾸는 데 씁니다.
 */

const SDK_ID = "kakao-map-sdk";

let kakaoSdkPromise: Promise<void> | null = null;

export function loadKakaoSdk(appkey: string): Promise<void> {
  if (typeof window !== "undefined" && (window as any).kakao?.maps) return Promise.resolve();
  if (kakaoSdkPromise) return kakaoSdkPromise;

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SDK_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Kakao SDK 로드 실패")));
      return;
    }
    const script = document.createElement("script");
    script.id = SDK_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false&libraries=services`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Kakao SDK 로드 실패"));
    document.head.appendChild(script);
  });

  kakaoSdkPromise = promise;
  // 실패했으면 다음 시도에서 다시 로드할 수 있도록 캐시를 비웁니다
  // (반환한 promise 자체는 그대로 reject 됩니다).
  promise.catch(() => {
    kakaoSdkPromise = null;
  });

  return promise;
}
