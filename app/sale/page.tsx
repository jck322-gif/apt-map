import { redirect } from "next/navigation";

// 매매는 이제 첫 화면(/)입니다. 예전 주소로 들어온 사람을 첫 화면으로 보냅니다.
export default function Page() {
  redirect("/");
}
