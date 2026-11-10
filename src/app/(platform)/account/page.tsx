import { Account } from "@/components/catalog/Account";
export const metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <Account />;
}
