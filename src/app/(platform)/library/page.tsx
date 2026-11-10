import { Library } from "@/components/catalog/Library";
export const metadata = {
  title: "Your library",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <Library />;
}
