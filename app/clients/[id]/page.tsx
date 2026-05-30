import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import MemoryEditor from "./MemoryEditor";
import type { Plan } from "@/lib/types";

interface Props {
  params: { id: string };
}

export default async function ClientPage({ params }: Props) {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name, industry")
    .eq("id", params.id)
    .eq("user_id", session.user.id)
    .single();

  if (clientError || !client) redirect("/dashboard");

  const { data: memory } = await supabase
    .from("client_memory")
    .select("*")
    .eq("client_id", params.id)
    .single();

  const { data: userRow } = await supabase
    .from("users")
    .select("plan")
    .eq("id", session.user.id)
    .single();

  const userPlan = (userRow?.plan as Plan) ?? "free";

  return (
    <div className="min-h-screen bg-warm-ivory">
      <nav className="border-b border-warm-taupe px-6 py-4 flex items-center gap-3 bg-white/60 backdrop-blur-sm">
        <Link
          href="/dashboard"
          className="text-warm-olive/60 hover:text-warm-olive text-sm transition-colors"
        >
          ← Dashboard
        </Link>
        <span className="text-warm-taupe">/</span>
        <span className="text-sm font-medium text-warm-olive">{client.name}</span>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-warm-olive">{client.name}</h1>
            {client.industry && (
              <p className="text-warm-olive/60 text-sm mt-1">{client.industry}</p>
            )}
          </div>
          <Link
            href={`/clients/${client.id}/chat`}
            className="bg-warm-olive hover:bg-brand-dark text-warm-ivory px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Open Chat →
          </Link>
        </div>

        <MemoryEditor
          clientId={client.id}
          clientName={client.name}
          clientIndustry={client.industry ?? ""}
          memory={memory}
          userPlan={userPlan}
        />
      </main>
    </div>
  );
}
