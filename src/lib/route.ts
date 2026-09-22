import { useSyncExternalStore } from "react";

export type AppRoute =
  | { page: "login" }
  | { page: "chat"; conversationId?: string };

const listeners = new Set<() => void>();

function currentHref() {
  return `${window.location.pathname}${window.location.search}`;
}

let snapshot = typeof window === "undefined" ? "/" : currentHref();

function emit() {
  snapshot = currentHref();
  for (const listener of listeners) listener();
}

function onPopState() {
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("popstate", onPopState);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("popstate", onPopState);
    }
  };
}

export function toPath(route: AppRoute): string {
  if (route.page === "login") return "/login";
  if (route.conversationId) return `/c/${route.conversationId}`;
  return "/";
}

export function parseRoute(pathname: string): AppRoute {
  const path =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname || "/";
  if (path === "/login") return { page: "login" };
  const match = path.match(/^\/c\/([0-9a-f-]{36})$/i);
  if (match) return { page: "chat", conversationId: match[1] };
  return { page: "chat" };
}

export function navigate(route: AppRoute, options?: { replace?: boolean }) {
  const next = toPath(route);
  if (`${window.location.pathname}` === next) {
    emit();
    return;
  }
  if (options?.replace) {
    window.history.replaceState(null, "", next);
  } else {
    window.history.pushState(null, "", next);
  }
  emit();
}

export function useAppRoute(): AppRoute {
  const href = useSyncExternalStore(subscribe, () => snapshot, () => "/");
  const url = new URL(href, window.location.origin);
  return parseRoute(url.pathname);
}
