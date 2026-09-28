/**
 * 이미지(ImageResponse)용 한글 폰트 불러오기.
 *
 * 구글 폰트에 완성형 한글을 통째로 요청하면 파일이 몇 MB씩 되어 느리므로, text= 로 그 이미지에
 * 쓰는 글자만 담은 작은 파일을 받습니다. (최신 브라우저인 척하면 satori가 못 읽는 woff2를 주므로
 * 일부러 오래된 크롬인 척합니다.) 폰트를 못 받아도 이미지는 나가야 하므로 실패하면 빈 목록을 줍니다.
 *
 * 개발용: OG_FONT_DIR 환경변수에 NotoSansKR-400.ttf / -700.ttf / -800.ttf 가 있으면 그걸 씁니다
 * (인터넷이 막힌 곳에서 미리보기를 확인할 때만 씁니다. 배포 환경에는 설정하지 않습니다).
 */
import { readFile } from "fs/promises";

export type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: "normal" };

async function loadGoogleFont(family: string, weight: number, text: string): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(
    text
  )}`;
  const cssRes = await fetch(cssUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
    },
  });
  const css = await cssRes.text();
  const match = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/);
  if (!match) throw new Error(`${family} 폰트 주소를 찾지 못했습니다`);
  const fontRes = await fetch(match[1]);
  if (!fontRes.ok) throw new Error(`${family} 폰트를 받지 못했습니다 (${fontRes.status})`);
  return fontRes.arrayBuffer();
}

export async function loadKoreanFonts(text: string, weights: (400 | 700 | 800)[] = [400, 700, 800]): Promise<OgFont[]> {
  const chars = Array.from(new Set(text)).join("");
  const dir = process.env.OG_FONT_DIR;
  const loaded = await Promise.all(
    weights.map(async (w) => {
      try {
        const data = dir
          ? ((await readFile(`${dir}/NotoSansKR-${w}.ttf`)).buffer as ArrayBuffer)
          : await loadGoogleFont("Noto Sans KR", w, chars);
        return { name: "Noto Sans KR", data, weight: w, style: "normal" } as OgFont;
      } catch {
        return null;
      }
    })
  );
  return loaded.filter((f): f is OgFont => f !== null);
}
