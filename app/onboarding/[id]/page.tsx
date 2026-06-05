import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ClientOnboarding from "@/components/ClientOnboarding";
import type { FreelancerType } from "@/lib/types";

interface Props {
  params: { id: string };
}

export default async function OnboardingPage({ params }: Props) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: client, error } = await supabase
    .from("clients")
    .select("id, name, freelancer_type")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !client) redirect("/dashboard");

  const { data: memory } = await supabase
    .from("client_memory")
    .select("id, brand_voice")
    .eq("client_id", client.id)
    .single();

  if (memory?.brand_voice) {
    redirect(`/clients/${client.id}/chat`);
  }

  const freelancerType =
    (client.freelancer_type as FreelancerType) || "general";

  return (
    <ClientOnboarding
      clientId={client.id}
      clientName={client.name}
      freelancerType={freelancerType}
    />
  );
}