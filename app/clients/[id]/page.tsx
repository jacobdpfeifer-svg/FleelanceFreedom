import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import ClientEditorLayout from "./ClientEditorLayout";
import type { Plan } from "@/lib/types";

interface Props {
  params: { id: string };
}

export default async function ClientPage({ params }: Props) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name, industry")
    .eq("id", params.id)
    .eq("user_id", user.id)
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
    .eq("id", user.id)
    .single();

  const userPlan = (userRow?.plan as Plan) ?? "free";

  return (
    <div className="min-h-screen bg-page">
      <nav className="bg-transparent border-none px-6 py-4 flex items-center gap-3">
        <a
          href="/dashboard"
          className="text-text-muted hover:text-text-primary text-sm transition-colors"
        >
          ← Dashboard
        </a>
        <span className="text-text-muted">/</span>
        <span className="text-sm font-medium text-text-primary">{client.name}</span>
      </nav>

      <ClientEditorLayout
        clientId={client.id}
        clientName={client.name}
        clientIndustry={client.industry ?? ""}
        chatHref={`/clients/${client.id}/chat`}
        memory={memory}
        userPlan={userPlan}
      />
    </div>
  );
}
