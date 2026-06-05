"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { ensureAppUser } from "@/lib/ensureAppUser";
import { getAppUrl } from "@/lib/stripe";

type AuthResult = { error?: string; redirectTo?: string };

async function finishAuth(
  supabase: ReturnType<typeof createServerClient>
): Promise<AuthResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign-in succeeded but session was lost. Try again." };
  }

  const setup = await ensureAppUser(supabase, user);
  if (setup.error) {
    // Auth succeeded; profile bootstrap failed. Still land on dashboard —
    // createNewClient will retry ensureAppUser with clearer errors there.
    console.error("finishAuth ensureAppUser:", setup.error);
  }

  return { redirectTo: "/dashboard" };
}

async function establishSession(
  supabase: ReturnType<typeof createServerClient>,
  email: string,
  password: string
): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return finishAuth(supabase);
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  const supabase = createServerClient();
  return establishSession(supabase, email, password);
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const firstName = (formData.get("first_name") as string)?.trim();
  const lastName = (formData.get("last_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!firstName) return { error: "First name is required." };
  if (!lastName) return { error: "Last name is required." };
  if (!email) return { error: "Email is required." };

  const supabase = createServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
      },
      emailRedirectTo: `${getAppUrl()}/dashboard`,
    },
  });

  if (error) return { error: error.message };

  if (data.user?.identities?.length === 0) {
    return {
      error: "An account with this email already exists. Try signing in instead.",
    };
  }

  if (data.session) {
    return finishAuth(supabase);
  }

  const signInResult = await establishSession(supabase, email, password);
  if (signInResult.redirectTo || signInResult.error) return signInResult;

  return {
    error:
      "Account created. Check your email for a confirmation link, then sign in.",
  };
}

export async function signOut() {
  const supabase = createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
