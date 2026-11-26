"use client";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { safeParseJSON } from "~/utils/json";

const CHANGE_EVENT = "local-storage-change";

/**
 * Keeps a value in the local storage and updates every component that uses the same key, in other tabs too.
 * The server has no local storage, so it renders with the initial value, which must not be a new object on each render.
 */
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | null) => void];
function useLocalStorage<T = string>(key: string, initialValue?: null): [T | null, (value: T | null) => void];
function useLocalStorage<T>(key: string, initialValue: T | null = null): [T | null, (value: T | null) => void] {
  const cache = useRef<{ string?: string | null, parsed: T | null }>({ parsed: null });

  const data = useSyncExternalStore(
    onChange => {
      const onStorageEvent = (e: Event) => {
        const customEvent = e as CustomEvent<{ key: string }>;
        if (customEvent.detail.key === key) onChange();
      };
      window.addEventListener("storage", onChange);
      window.addEventListener(CHANGE_EVENT, onStorageEvent as EventListener);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(CHANGE_EVENT, onStorageEvent as EventListener);
      };
    },
    () => {
      const item = cache.current;
      const rawData = localStorage.getItem(key);

      if (rawData !== item.string) {
        item.parsed = rawData ? (safeParseJSON<T>(rawData) ?? initialValue) : initialValue;
        item.string = rawData;
      }

      return item.parsed;
    },
    () => initialValue,
  );

  const setData = useCallback((value: T | null) => {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }));
  }, [key]);

  return [data, setData] as const;
}

export default useLocalStorage;
