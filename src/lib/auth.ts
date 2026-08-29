import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Who may run the admin portal.
 *
 * What was here before was not a weak lock, it was no lock: the password was
 * the literal string "password", `isAuthenticated` was never called from
 * anywhere, and `/admin/login` redirected straight to the dashboard. Every
 * visitor had Products, Orders and Feedback.
 *
 * The account now comes from Supabase Auth, the same sign-in the shop already
 * uses. Note what this file can and cannot do: it decides what the browser
 * *shows*. It is not what keeps anyone out — a determined visitor can edit
 * their own JavaScript. The real boundaries are server-side, in the
 * `r2-upload-url` function and in row-level security on the tables, and this
 * only spares an ordinary shopper a screen they have no business seeing.
 */

/**
 * Public on purpose: knowing who the administrator is reveals nothing, and the
 * server keeps its own copy in `ADMIN_EMAILS` that actually decides. Unset means
 * nobody, so a half-finished deploy locks the door rather than leaving it open.
 */
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS as string | undefined ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const adminAllowlistConfigured = ADMIN_EMAILS.length > 0;

export const isAdminUser = (user: User | null | undefined): boolean => {
  if (!user?.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
};

export const signInAdmin = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false as const, message: error.message };
  if (!isAdminUser(data.user)) {
    // Signed in as a real person, just not one who runs the shop. Drop the
    // session again so an ordinary account is never left holding an admin tab.
    await supabase.auth.signOut();
    return { ok: false as const, message: "This account does not have admin access." };
  }
  return { ok: true as const };
};

export const signOutAdmin = () => supabase.auth.signOut();
