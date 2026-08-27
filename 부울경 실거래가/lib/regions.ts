// 부산 16개 구·군 + 울산 5개 구·군 법정동코드(LAWD_CD, 시군구 5자리)
// x, y는 개념도(SVG) 표시용 좌표이고, lat/lng은 실제 카카오맵에 표시할 대략적인 구청 위치입니다.
// lat/lng은 정밀 측량값이 아니라 구 중심 근처의 참고 좌표이니, 실제 서비스에서는 필요 시 보정하세요.
export type Region = {
  code: string;
  name: string;
  group: "부산" | "울산";
  x: number;
  y: number;
  lat: number;
  lng: number;
  dongs: string[];
};

export const REGIONS: Region[] = [
  { code: "26110", name: "중구", group: "부산", x: 300, y: 330, lat: 35.106, lng: 129.032, dongs: ["남포동", "동광동"] },
  { code: "26140", name: "서구", group: "부산", x: 260, y: 352, lat: 35.098, lng: 129.024, dongs: ["동대신동", "아미동"] },
  { code: "26170", name: "동구", group: "부산", x: 322, y: 318, lat: 35.129, lng: 129.045, dongs: ["초량동", "수정동"] },
  { code: "26200", name: "영도구", group: "부산", x: 292, y: 378, lat: 35.091, lng: 129.068, dongs: ["봉래동", "청학동"] },
  { code: "26230", name: "부산진구", group: "부산", x: 278, y: 288, lat: 35.163, lng: 129.053, dongs: ["부전동", "전포동"] },
  { code: "26260", name: "동래구", group: "부산", x: 262, y: 246, lat: 35.204, lng: 129.084, dongs: ["명륜동", "온천동"] },
  { code: "26290", name: "남구", group: "부산", x: 332, y: 352, lat: 35.136, lng: 129.084, dongs: ["대연동", "용호동"] },
  { code: "26320", name: "북구", group: "부산", x: 224, y: 250, lat: 35.198, lng: 128.990, dongs: ["화명동", "덕천동"] },
  { code: "26350", name: "해운대구", group: "부산", x: 378, y: 262, lat: 35.163, lng: 129.163, dongs: ["우동", "재송동", "중동"] },
  { code: "26380", name: "사하구", group: "부산", x: 210, y: 366, lat: 35.104, lng: 128.974, dongs: ["하단동", "괴정동"] },
  { code: "26410", name: "금정구", group: "부산", x: 236, y: 198, lat: 35.243, lng: 129.092, dongs: ["장전동", "부곡동"] },
  { code: "26440", name: "강서구", group: "부산", x: 132, y: 300, lat: 35.212, lng: 128.980, dongs: ["명지동", "대저동"] },
  { code: "26470", name: "연제구", group: "부산", x: 296, y: 266, lat: 35.176, lng: 129.079, dongs: ["연산동", "거제동"] },
  { code: "26500", name: "수영구", group: "부산", x: 352, y: 312, lat: 35.145, lng: 129.113, dongs: ["남천동", "광안동"] },
  { code: "26530", name: "사상구", group: "부산", x: 196, y: 296, lat: 35.152, lng: 128.991, dongs: ["괘법동", "덕포동"] },
  { code: "26710", name: "기장군", group: "부산", x: 428, y: 214, lat: 35.245, lng: 129.222, dongs: ["정관읍", "일광면"] },
  { code: "31110", name: "중구", group: "울산", x: 560, y: 150, lat: 35.569, lng: 129.333, dongs: ["성남동", "우정동"] },
  { code: "31140", name: "남구", group: "울산", x: 592, y: 178, lat: 35.544, lng: 129.330, dongs: ["삼산동", "신정동"] },
  { code: "31170", name: "동구", group: "울산", x: 628, y: 158, lat: 35.505, lng: 129.417, dongs: ["전하동", "방어동"] },
  { code: "31200", name: "북구", group: "울산", x: 548, y: 112, lat: 35.583, lng: 129.361, dongs: ["화봉동", "매곡동"] },
  { code: "31710", name: "울주군", group: "울산", x: 494, y: 84, lat: 35.522, lng: 129.240, dongs: ["범서읍", "온양읍"] },
];
