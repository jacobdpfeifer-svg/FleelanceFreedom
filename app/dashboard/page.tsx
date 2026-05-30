import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { createNewClient, signOut } from "./actions";
import type { Client } from "@/lib/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { error?: string; checkout?: string };
}) {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("clients fetch error:", error.message);
  }

  const { data: user } = await supabase
    .from("users")
    .select("plan")
    .eq("id", session.user.id)
    .single();

  const plan = user?.plan ?? "free";
  const clientList: Client[] = clients ?? [];
  const atFreeLimit = plan === "free" && clientList.length >= 1;

  return (
    <div className="min-h-screen bg-warm-ivory">
      <nav className="border-b border-warm-taupe px-6 py-4 flex items-center justify-between bg-white/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-warm-olive flex items-center justify-center text-warm-ivory font-bold text-xs">
            FF
          </div>
          <span className="font-semibold text-warm-olive">Freelance Freedom</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-warm-olive/60 capitalize">{plan} plan</span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-warm-olive/60 hover:text-warm-olive transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {searchParams.checkout === "success" && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-xl">
            Subscription active — your plan has been upgraded.
          </div>
        )}

        {searchParams.error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-xl">
            {searchParams.error}
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-warm-olive">Clients</h1>
            <p className="text-warm-olive/60 text-sm mt-1">
              {clientList.length} client{clientList.length !== 1 ? "s" : ""}
            </p>
          </div>

          {atFreeLimit ? (
            <Link
              href="/pricing"
              className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-700 hover:bg-amber-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Upgrade to add more clients
            </Link>
          ) : (
            <form action={createNewClient}>
              <button
                type="submit"
                className="flex items-center gap-2 bg-warm-olive hover:bg-brand-dark text-warm-ivory px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <span className="text-lg leading-none">+</span>
                New client
              </button>
            </form>
          )}
        </div>

        {atFreeLimit && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-amber-900 font-medium text-sm">
                Free plan: 1 client limit reached
              </p>
              <p className="text-amber-800/70 text-xs mt-0.5">
                Upgrade to Pro for unlimited clients, messages, and decision history.
              </p>
            </div>
            <Link
              href="/pricing"
              className="bg-amber-600 hover:bg-amber-500 text-warm-ivory px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Upgrade — $9/mo
            </Link>
          </div>
        )}

        {clientList.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-warm-taupe rounded-2xl bg-white/50">
            <p className="text-warm-olive/50 mb-4">No clients yet.</p>
            <form action={createNewClient}>
              <button
                type="submit"
                className="bg-warm-olive hover:bg-brand-dark text-warm-ivory px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Create your first client
              </button>
            </form>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientList.map((client) => (
              <div
                key={client.id}
                className="group relative bg-white border border-warm-taupe hover:border-warm-olive/40 rounded-xl p-5 transition-colors shadow-sm"
              >
                <Link
                  href={`/clients/${client.id}`}
                  className="absolute inset-0 z-0 rounded-xl"
                  aria-label={`Open ${client.name}`}
                />
                <div className="relative z-10 pointer-events-none">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-full bg-warm-cream flex items-center justify-center text-warm-olive font-semibold text-sm">
                      {client.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs text-warm-olive/50">
                      {new Date(client.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="font-semibold text-warm-olive group-hover:text-brand-dark transition-colors">
                    {client.name}
                  </h2>
                  {client.industry && (
                    <p className="text-warm-olive/60 text-sm mt-1">{client.industry}</p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <span className="text-xs text-warm-olive/50 bg-warm-cream px-2 py-1 rounded">
                      Memory
                    </span>
                    <Link
                      href={`/clients/${client.id}/chat`}
                      className="pointer-events-auto text-xs text-warm-olive bg-warm-cream hover:bg-warm-taupe/40 px-2 py-1 rounded transition-colors"
                    >
                      Chat →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
