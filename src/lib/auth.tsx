import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import type { AuthRole } from "./database.types";
import { errorMessage } from "./errors";
import { SUPABASE_ANON_KEY, functionsUrl, supabase } from "./supabase";

export type AuthState = {
  loading: boolean;
  session: Session | null;
  role: AuthRole | null;
  profileId: string | null;
  displayName: string | null;
  studentId: string | null;
  isStudent: boolean;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
};

type ProfileRow = {
  id: string;
  role: AuthRole;
  display_name: string;
  student_id: string | null;
};

const AUTH_TIMEOUT_MS = 20_000;

const AuthContext = createContext<AuthState | null>(null);

function emptyIdentity() {
  return {
    role: null as AuthRole | null,
    profileId: null as string | null,
    displayName: null as string | null,
    studentId: null as string | null,
  };
}

async function fetchProfile(authUserId: string): Promise<{
  data: ProfileRow | null;
  error: { message?: string } | null;
}> {
  if (!supabase) {
    return { data: null, error: { message: "Login is not configured yet." } };
  }
  const result = await supabase
    .from("profiles")
    .select("id, role, display_name, student_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  return {
    data: (result.data as ProfileRow | null) ?? null,
    error: result.error,
  };
}

async function linkGoogleProfile(accessToken: string): Promise<{
  linked: boolean;
  error?: string;
}> {
  if (!functionsUrl) {
    return { linked: false, error: "Login is not configured yet." };
  }
  const response = await fetch(`${functionsUrl}/link-google-profile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
  });
  let payload: { linked?: boolean; error?: unknown } = {};
  try {
    payload = (await response.json()) as { linked?: boolean; error?: unknown };
  } catch {
    /* ignore */
  }
  if (!response.ok) {
    const message =
      typeof payload.error === "string" && payload.error
        ? payload.error
        : "Could not link this Google account.";
    return { linked: false, error: message };
  }
  return { linked: Boolean(payload.linked) };
}

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      reject(new Error(`${label} timed out after ${AUTH_TIMEOUT_MS}ms`));
    }, AUTH_TIMEOUT_MS);
    promise.then(
      (value) => {
        globalThis.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        globalThis.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [identity, setIdentity] = useState(emptyIdentity);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    withTimeout(supabase.auth.getSession(), "session restore")
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        if (!data.session) setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    if (!session) {
      setIdentity(emptyIdentity());
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    void Promise.resolve(fetchProfile(session.user.id))
      .then(async ({ data, error }) => {
        if (!active) return;
        let row = data;
        let lookupError = error;
        if (!lookupError && !row) {
          const linked = await linkGoogleProfile(session.access_token);
          if (linked.linked) {
            const again = await fetchProfile(session.user.id);
            row = again.data;
            lookupError = again.error;
          }
        }
        if (!active) return;
        if (lookupError || !row) {
          setIdentity(emptyIdentity());
          setLoading(false);
          return;
        }
        setIdentity({
          role: row.role,
          profileId: row.id,
          displayName: row.display_name,
          studentId: row.student_id,
        });
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setIdentity(emptyIdentity());
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session]);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      ...identity,
      isStudent: identity.role === "student",
      async signInWithGoogle() {
        try {
          if (!supabase) return "Login is not configured yet.";
          const origin = window.location.origin;
          const { error } = await withTimeout(
            supabase.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: `${origin}/login`,
                queryParams: {
                  prompt: "select_account",
                  hd: "uwccostarica.org",
                },
              },
            }),
            "google sign in",
          );
          return error ? error.message : null;
        } catch (error: unknown) {
          return errorMessage(error, "Google sign in failed.");
        }
      },
      async signOut() {
        if (!supabase) return;
        await supabase.auth.signOut();
      },
    }),
    [loading, session, identity],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
