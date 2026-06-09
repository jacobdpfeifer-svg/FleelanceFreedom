import Button from "@/components/Button";

export default function JoinStrip() {
  return (
    <section className="border-y border-border bg-card/80 px-6 py-8">
      <div className="flex flex-col items-center justify-center gap-4 text-center sm:flex-row">
        <p className="text-sm text-text-primary">
          Free for your first client. No card required.
        </p>
        <Button href="/login" variant="primary">
          Create free account
        </Button>
      </div>
    </section>
  );
}
