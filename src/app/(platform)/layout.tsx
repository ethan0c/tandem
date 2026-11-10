import { LibraryProvider } from "@/components/catalog/LibraryProvider";
import { PlatformShell } from "@/components/catalog/PlatformShell";
export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LibraryProvider>
      <PlatformShell>{children}</PlatformShell>
    </LibraryProvider>
  );
}
