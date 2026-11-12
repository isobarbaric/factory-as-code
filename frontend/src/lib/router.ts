import { useSyncExternalStore } from "react";

export interface Route {
  repo?: string;
  entity?: string;
  record?: string;
}

function parse(pathname: string): Route {
  const [repo, entity, record] = pathname
    .split("/")
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));
  return { repo, entity, record };
}

export function routePath(route: Route): string {
  const parts = [route.repo, route.entity, route.record].filter(
    (part): part is string => !!part,
  );
  return "/" + parts.map(encodeURIComponent).join("/");
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

export function navigate(route: Route, { replace = false } = {}) {
  const path = routePath(route);
  if (path === window.location.pathname) return;
  if (replace) window.history.replaceState(null, "", path);
  else window.history.pushState(null, "", path);
  listeners.forEach((listener) => listener());
}

let cachedPath = "";
let cachedRoute: Route = {};

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => {
    if (window.location.pathname !== cachedPath) {
      cachedPath = window.location.pathname;
      cachedRoute = parse(cachedPath);
    }
    return cachedRoute;
  });
}
