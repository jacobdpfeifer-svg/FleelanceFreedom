import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { createNewClient, signOut } from "./actions";
import type { Client } from "@/lib/types";
import { Button } from "@/components/ui";
import ClientGrid from "./ClientGrid";
import NewClientButton from "./NewClientButton";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { error?: string; checkout?: string };
}) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("clients fetch error:", error.message);
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = userRow?.plan ?? "free";
  const clientList: Client[] = clients ?? [];
  const FREE_CLIENT_LIMIT = 1;
  const atFreeLimit = plan === "free" && clientList.length >= FREE_CLIENT_LIMIT;

  return (
    <div className="min-h-screen bg-page">
      <nav className="bg-transparent border-none px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-text-primary font-bold text-xs">
            FF
          </div>
          <span className="font-semibold text-text-primary">Freelance Freedom</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{plan} plan</span>
          {plan === "free" && (
            <Link
              href="/pricing"
              className="text-[10px] font-semibold uppercase tracking-wider bg-accent text-[#041A12] px-2.5 py-1 rounded-md hover:bg-accent-press transition-colors whitespace-nowrap"
            >
              Upgrade
            </Link>
          )}
          <form action={signOut}>
            <Button type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {searchParams.checkout === "success" && (
          <div className="mb-6 bg-raised border border-success/30 text-sm px-4 py-3 rounded-[10px]">
            Subscription active — your plan has been upgraded.
          </div>
        )}

        {searchParams.error && (
          <div className="mb-6 bg-raised border border-danger/30 text-sm px-4 py-3 rounded-[10px]">
            {searchParams.error}
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Clients</h1>
            <p className="text-text-muted text-sm mt-1">
              {clientList.length} client{clientList.length !== 1 ? "s" : ""}
            </p>
          </div>

          {atFreeLimit ? (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 bg-accent text-[#041A12] text-xs font-semibold px-3.5 py-2 rounded-md hover:bg-accent-press transition-colors whitespace-nowrap"
            >
              <span className="text-sm leading-none" aria-hidden="true">+</span>
              Upgrade to add clients
            </Link>
          ) : (
            <NewClientButton />
          )}
        </div>


        {clientList.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-[10px] bg-card/50">
            <p className="text-text-muted mb-4">No clients yet.</p>
            <form action={createNewClient}>
              <Button type="submit" variant="primary">
                Create your first client
              </Button>
            </form>
          </div>
        ) : (
          <ClientGrid clients={clientList} />
        )}
      </main>
    </div>
  );
}
