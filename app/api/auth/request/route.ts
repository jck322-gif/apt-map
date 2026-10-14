import { NextResponse } from "next/server";

/** (사용 중지) 예전 "메일 링크로 로그인" 주소 — 아이디·비밀번호 / 카카오·구글 로그인으로 바뀌었습니다. */
export async function POST() {
  return NextResponse.json({ ok: false, error: "로그인 방식이 바뀌었어요. 새로고침 후 다시 시도해 주세요." }, { status: 410 });
}
