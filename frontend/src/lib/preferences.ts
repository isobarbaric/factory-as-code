import { useSyncExternalStore } from "react";

export const ThemePreference = {
  Light: "light",
  Dark: "dark",
  System: "system",
} as const;
export type ThemePreference = (typeof ThemePreference)[keyof typeof ThemePreference];

const THEME_KEY = "pac.theme";
const NAME_KEY = "pac.displayName";
const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Preferences are a convenience; the UI works without storage.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

export function applyTheme() {
  const preference = (read(THEME_KEY) as ThemePreference | null) ?? ThemePreference.System;
  const dark =
    preference === ThemePreference.Dark ||
    (preference === ThemePreference.System && darkQuery.matches);
  document.documentElement.classList.toggle("dark", dark);
}

darkQuery.addEventListener("change", applyTheme);

export function useThemePreference(): [ThemePreference, (value: ThemePreference) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => (read(THEME_KEY) as ThemePreference | null) ?? ThemePreference.System,
  );
  return [
    value,
    (next) => {
      write(THEME_KEY, next);
      applyTheme();
    },
  ];
}

export const DEFAULT_DISPLAY_NAME = "You";

export function useDisplayName(): [string, (value: string) => void] {
  const value = useSyncExternalStore(subscribe, () => read(NAME_KEY) || DEFAULT_DISPLAY_NAME);
  return [value, (next) => write(NAME_KEY, next.trim() || DEFAULT_DISPLAY_NAME)];
}
