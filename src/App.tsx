import { useEffect } from "react";
import { Toaster } from "sonner";
import { LoginPage } from "./components/LoginPage";
import { ChatApp } from "./components/ChatApp";
import { AuthProvider, useAuth } from "./lib/auth";
import { navigate, useAppRoute } from "./lib/route";

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
      <Toaster
        position="top-center"
        toastOptions={{
          className:
            "rounded-2xl border-0 bg-surface-container-lowest text-on-surface shadow-[0_8px_32px_rgba(4,22,39,0.12)]",
        }}
      />
    </AuthProvider>
  );
}

function AppShell() {
  const route = useAppRoute();
  const auth = useAuth();

  useEffect(() => {
    if (auth.loading) return;
    if (auth.isStudent && route.page === "login") {
      navigate({ page: "chat" }, { replace: true });
      return;
    }
    if (!auth.isStudent && route.page !== "login") {
      navigate({ page: "login" }, { replace: true });
    }
  }, [auth.loading, auth.isStudent, route.page]);

  if (auth.loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface text-on-surface-variant">
        <p className="text-body-md">Loading…</p>
      </div>
    );
  }

  if (!auth.isStudent || route.page === "login") {
    return <LoginPage />;
  }

  return (
    <ChatApp
      conversationId={route.page === "chat" ? route.conversationId : undefined}
    />
  );
}
