import Dashboard from "@/components/Dashboard";
import { REGIONS } from "@/lib/regions";

export default function Page() {
  return <Dashboard staticRegions={REGIONS} mode="home" />;
}
