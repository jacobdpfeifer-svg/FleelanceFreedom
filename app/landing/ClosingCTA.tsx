import Button from "@/components/Button";

export default function ClosingCTA() {
  return (
    <section className="px-6 py-20 text-center">
      <h2 className="mb-2 text-3xl font-bold leading-tight tracking-[-0.02em] text-[#DCF2EA]">
        Stay in <span className="text-accent">their</span> voice.
        <br />
        Stay in <span className="text-accent">your</span> flow.
      </h2>
      <p className="mb-8 mt-3 text-sm text-text-muted">
        One client free, forever. No card.
      </p>

      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button href="/login" variant="primary">
          Start free
        </Button>
        <Button href="#demo" variant="secondary">
          See a live demo
        </Button>
      </div>
    </section>
  );
}
