/**
 * 부울아파트 로고 마크 — 부산의 갈매기와 울산의 고래가 바다 위에 함께 있는 형태입니다.
 * 앱 아이콘처럼 자체 배경을 가지는 마크라, 다크모드에서도 같은 색으로 보이도록
 * 색상값을 직접 넣었습니다 (app/icon.svg 파비콘과 똑같은 그림입니다).
 */
export default function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="부울아파트 로고 — 갈매기와 고래"
      style={{ flexShrink: 0, display: "block" }}
    >
      <defs>
        <clipPath id="logo-clip">
          <rect x="0" y="0" width="40" height="40" rx="9" />
        </clipPath>
      </defs>
      <rect x="0" y="0" width="40" height="40" rx="9" fill="#eaf1f4" />

      <g clipPath="url(#logo-clip)">
        {/* 갈매기 (부산) */}
        <g stroke="#d9663f" strokeWidth="2.3" strokeLinecap="round" fill="none">
          <path d="M7.5 11.5 Q 10.5 7.8 13.5 11.5" />
          <path d="M13.5 11.5 Q 16.5 7.8 19.5 11.5" />
        </g>

        {/* 고래 (울산) — 꼬리지느러미 + 몸통 */}
        <g fill="#144951">
          <path d="M25 28.5 C 27.5 24 31 20.6 35.6 18.6 C 36.4 22.6 35.8 27 33.8 30.6 C 30.6 30.6 27.4 30 25 28.5 Z" />
          <path d="M4.5 31.5 C 3.8 24 9.6 19.4 16.2 20 C 22 20.5 26 24.6 27 30.5 L 27 32 L 4.5 32 Z" />
        </g>
        <circle cx="10.4" cy="25.2" r="1.15" fill="#eaf1f4" />

        {/* 바다 */}
        <path
          d="M-2 29.6 Q 4 26.1 10 29.6 T 22 29.6 T 34 29.6 T 46 29.6 L 46 42 L -2 42 Z"
          fill="#5aa9d6"
          opacity="0.55"
        />
        <path
          d="M-2 31.4 Q 4 27.9 10 31.4 T 22 31.4 T 34 31.4 T 46 31.4 L 46 42 L -2 42 Z"
          fill="#1f6fb0"
        />
      </g>
    </svg>
  );
}
