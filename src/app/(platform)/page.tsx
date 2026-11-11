import { Discover } from "@/components/catalog/Discover";
import { getHomeRows } from "@/lib/home-rows";

export default async function Page() {
  return <Discover rows={await getHomeRows()} />;
}
