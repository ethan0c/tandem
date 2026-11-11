import { Discover } from "@/components/catalog/Discover";
import { getHomeRows } from "@/lib/home-rows";
export const metadata = { title: "Home" };
export default async function Page() {
  return <Discover rows={await getHomeRows()} />;
}
