import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import Button from "@/components/Button";
import LandingHero from "./landing/LandingHero";
import ProblemSection from "./landing/ProblemSection";
import SolutionFlow from "./landing/SolutionFlow";
import ClosingCTA from "./landing/ClosingCTA";
import JoinStrip from "./landing/JoinStrip";

export default async function RootPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return <LandingPage />;
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-page">

      {/* ── Nav ── */}
      <nav aria-label="Primary" className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent text-[#041109] font-bold flex items-center justify-center text-xs tracking-tight select-none">
            FF
          </div>
          <span className="font-semibold text-text-primary text-sm hidden sm:block">
            Freelance Freedom
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button href="/login" variant="ghost">Sign in</Button>
          <div className="hidden sm:block w-px h-5 bg-border mx-1" aria-hidden="true" />
          <Button href="/login" variant="primary">
            <span className="hidden sm:inline">Create free account</span>
            <span className="sm:hidden">Sign up</span>
          </Button>
        </div>
      </nav>

      {/* ── Sections ── */}
      <LandingHero />
      <ProblemSection />
      <SolutionFlow />
      <JoinStrip />
      <ClosingCTA />

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card px-6 py-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent text-[#041A12] font-bold flex items-center justify-center text-[10px] tracking-tight select-none">
              FF
            </div>
            <span className="text-sm font-semibold text-text-primary">Freelance Freedom</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-text-muted">
            <Link href="/login" className="hover:text-text-primary transition-colors">Sign in</Link>
            <Link href="/pricing" className="hover:text-text-primary transition-colors">Pricing</Link>
          </div>
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} Freelance Freedom
          </p>
        </div>
      </footer>

    </div>
  );
}
