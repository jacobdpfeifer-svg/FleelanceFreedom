import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import Button from "@/components/Button";
import Hero from "./landing/Hero";
import FeatureCard from "./landing/FeatureCard";

export default async function RootPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return <LandingPage />;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function MemoryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="7.5" r="1.5" fill="currentColor" />
      <path
        d="M7 13.5c0-1.657 1.343-3 3-3s3 1.343 3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M14 3.5l2.5 2.5L6 16.5 3 17l.5-3L14 3.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 5.5l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LearnIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4.5 10a5.5 5.5 0 1 1 1.37 3.63"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M4.5 14V10h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <MemoryIcon />,
    headline: "Remembers every client",
    description:
      "Each client's tone, preferences, and quirks are stored so you never have to re-explain context at the start of every session.",
  },
  {
    icon: <PenIcon />,
    headline: "Writes in their voice",
    description:
      "Generate emails, captions, and long-form copy that sounds exactly like them — not like a generic AI template.",
  },
  {
    icon: <LearnIcon />,
    headline: "Learns from rejections",
    description:
      "Every 'not quite' trains the model. The longer you use it, the tighter each client's fit becomes.",
  },
];

const FREE_FEATURES = ["1 client", "50 messages / month", "Memory editor & chat"];
const PRO_FEATURES = ["Unlimited clients", "Unlimited messages", "Full decision history"];

const DEMO_CHIPS = ["em-dash", "short sentences", "first person", "no jargon"];

// ─── Page ─────────────────────────────────────────────────────────────────────

function LandingPage() {
  return (
    <div className="min-h-screen bg-page">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent text-text-primary font-bold flex items-center justify-center text-xs tracking-tight select-none">
            FF
          </div>
          <span className="font-semibold text-text-primary text-sm hidden sm:block">
            Freelance Freedom
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button href="/login" variant="ghost">
            Sign in
          </Button>
          <Button href="/login" variant="primary">
            Get started
          </Button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <Hero />

      {/* ── Faux demo ── */}
      <section id="demo" className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest text-text-muted uppercase mb-6">
            Paste their copy. We detect the patterns.
          </p>
          <div className="rounded-[10px] border border-border/60 bg-card shadow-card p-5 text-left mb-6">
            <p className="text-[10px] font-semibold tracking-widest text-text-muted uppercase mb-3">
              Sample input
            </p>
            <p className="text-sm text-text-primary/75 leading-relaxed italic">
              &ldquo;Their brand voice is warm and direct. They avoid corporate jargon,
              write in first person, and use short punchy sentences — often with an
              em-dash for rhythm.&rdquo;
            </p>
          </div>

          <p className="text-[11px] text-text-muted mb-3 tracking-wide">
            Detected traits
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {DEMO_CHIPS.map((chip, i) => (
              <span
                key={chip}
                className="px-3 py-1.5 rounded-pill text-sm font-medium bg-raised text-text-primary border border-border/60 inline-block motion-reduce:[animation-play-state:paused]"
                style={{
                  opacity: 0,
                  animationName: "stampIn",
                  animationDuration: "2.8s",
                  animationTimingFunction: "var(--ease-bounce)",
                  animationFillMode: "both",
                  animationIterationCount: "infinite",
                  animationDelay: `${i * 240}ms`,
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature cards ── */}
      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-text-primary text-center mb-10">
            Everything a voice-conscious freelancer needs.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <FeatureCard key={f.headline} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing teaser ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Simple pricing</h2>
          <p className="text-text-muted text-sm mb-10">
            Start free. Upgrade when you need more clients.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl mx-auto">
            {/* Free panel */}
            <div className="rounded-[10px] border border-border bg-card p-6 text-left flex flex-col gap-4">
              <div>
                <p className="text-base font-semibold text-text-primary">Free</p>
                <p className="text-3xl font-bold text-text-primary mt-1">
                  $0
                  <span className="text-sm font-normal text-text-muted ml-1">
                    forever
                  </span>
                </p>
              </div>
              <ul className="space-y-2 flex-1">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="text-sm text-text-muted flex items-start gap-2">
                    <span className="text-success mt-0.5 flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button href="/login" variant="secondary" className="w-full justify-center">
                Get started free
              </Button>
            </div>

            {/* Pro panel */}
            <div className="rounded-[10px] border-2 border-accent bg-card p-6 text-left flex flex-col gap-4 shadow-lift">
              <div>
                <p className="text-base font-semibold text-accent">Pro</p>
                <p className="text-3xl font-bold text-text-primary mt-1">
                  $9
                  <span className="text-sm font-normal text-text-muted ml-1">
                    / month
                  </span>
                </p>
              </div>
              <ul className="space-y-2 flex-1">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="text-sm text-text-muted flex items-start gap-2">
                    <span className="text-success mt-0.5 flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button href="/pricing" variant="primary" className="w-full justify-center">
                Upgrade — $9/mo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card px-6 py-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent text-[#041A12] font-bold flex items-center justify-center text-[10px] tracking-tight select-none">
              FF
            </div>
            <span className="text-sm font-semibold text-text-primary">Freelance Freedom</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-xs text-text-muted">
            <Link href="/login" className="hover:text-text-primary transition-colors">
              Sign in
            </Link>
            <Link href="/pricing" className="hover:text-text-primary transition-colors">
              Pricing
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} Freelance Freedom
          </p>
        </div>
      </footer>
    </div>
  );
}
