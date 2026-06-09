"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { ensureAppUser } from "@/lib/ensureAppUser";

function dashboardWithError(message: string): never {
  redirect(`/dashboard?error=${encodeURIComponent(message)}`);
}

export async function createNewClient() {
  const supabase = createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login");

  const setup = await ensureAppUser(supabase, user);
  if (setup.error) dashboardWithError(setup.error);

  const { data: profile } = await supabase
    .from("users")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (profile?.plan === "free") {
    const { count } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count ?? 0) >= 1) {
      dashboardWithError(
        "Free plan includes one client. Upgrade to add more."
      );
    }
  }

  const { data: client, error } = await supabase
    .from("clients")
    .insert({ user_id: user.id, name: "New Client" })
    .select("id")
    .single();

  if (error || !client) {
    console.error("create client error:", error?.message);
    dashboardWithError(
      error?.message ??
        "Could not create a client. Please try again in a moment."
    );
  }

  redirect(`/clients/${client.id}`);
}

export async function signOut() {
  const supabase = createServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
