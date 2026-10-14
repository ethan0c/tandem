import type { Metadata } from "next";
import Link from "next/link";
import { HeaderFrame } from "@/components/HeaderFrame";
import { Logo } from "@/components/Logo";
import { PlanForm } from "@/components/plan/PlanForm";

export const metadata: Metadata = {
  title: "Plan a watch night",
  description: "Pick a time, send one link, and get a reminder. Your partner sees the time in their own time zone.",
};

export default function PlanPage() {
  return (
    <div className="relative flex flex-1 flex-col items-center text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-[radial-gradient(50rem_20rem_at_50%_-5%,rgb(124_58_237/0.25),transparent_60%)]" />
      <header className="relative w-full">
        <HeaderFrame>
          <Link href="/" aria-label="Tandem home">
            <Logo size={24} light />
          </Link>
        </HeaderFrame>
      </header>
      <main className="relative w-full max-w-lg flex-1 px-5 py-12">
        <h1 className="font-display text-4xl font-medium tracking-[-0.03em]">Plan a watch night</h1>
        <p className="mt-3 leading-relaxed text-zinc-400">
          Pick a time and send one link. Your partner sees it in their own time zone, can add it to their calendar, and joins with one click.
        </p>
        <PlanForm />
      </main>
    </div>
  );
}
