import { useCallback, useEffect, useRef, useState } from "react";
import { isProgress, loadSaves, saveProgress, type Progress } from "../../lib/api/saves";

type Slots = Partial<Record<number, Progress>>;
const emptySave: Progress = { planet: "market", observed: [], badges: [], visited: [] };
const prefix = "voices-saves:";

export function clearSaveCache(accountId: string) {
  try {
    localStorage.removeItem(prefix + accountId);
    localStorage.removeItem(prefix + accountId + ":slot");
  } catch { /* The game also works with browser storage disabled. */ }
}

export function useSaveSlot(accountId: string) {
  const [slot, setSlot] = useState(1);
  const [savedSlots, setSavedSlots] = useState<Slots>({});
  const [saveStatus, setSaveStatus] = useState("");
  const [slotLoading, setSlotLoading] = useState(true);
  const [syncFailed, setSyncFailed] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const confirmed = useRef<Slots>({});
  const pending = useRef(new Map<number, Progress>());
  const drain = useRef<Promise<void> | null>(null);
  const lifecycle = useRef<AbortController | null>(null);
  const key = prefix + accountId;

  const flushSaves = useCallback(() => {
    const signal = lifecycle.current?.signal;
    if (!signal || signal.aborted) return Promise.resolve(!pending.current.size);
    drain.current ??= (async () => {
      setSyncFailed(false);
      for (const [number, progress] of pending.current) {
        while (!signal.aborted) {
          const latest = pending.current.get(number) ?? progress;
          try {
            await saveProgress(accountId, number, latest, signal);
            if (signal.aborted) return;
            confirmed.current[number] = latest;
            try { localStorage.setItem(key, JSON.stringify(confirmed.current)); } catch { /* PostgreSQL has the save. */ }
            if (pending.current.get(number) === latest) {
              pending.current.delete(number);
              break;
            }
          } catch {
            if (!signal.aborted) {
              setSyncFailed(true);
              setSaveStatus("Progress is waiting to sync.");
            }
            return;
          }
        }
      }
      if (!signal.aborted) setSaveStatus("");
    })().finally(() => { drain.current = null; });
    return drain.current.then(() => !pending.current.size);
  }, [accountId, key]);

  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    const onOnline = () => { void flushSaves(); };
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (!pending.current.size) return;
      event.preventDefault();
      event.returnValue = true;
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => {
      controller.abort();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", warnBeforeUnload);
    };
  }, [flushSaves]);

  useEffect(() => {
    const controller = new AbortController();
    try {
      const previous = Number(localStorage.getItem(key + ":slot"));
      if (previous === 2 || previous === 3) setSlot(previous);
      const value = JSON.parse(localStorage.getItem(key) ?? "{}");
      if (value && typeof value === "object") {
        const cached: Slots = {};
        for (const number of [1, 2, 3]) {
          if (isProgress(value[number])) cached[number] = value[number];
        }
        setSavedSlots(cached);
      }
    } catch { /* An unreadable cache is replaced with the server snapshot. */ }

    loadSaves(accountId, controller.signal).then((remote) => {
      if (controller.signal.aborted) return;
      confirmed.current = remote;
      setSavedSlots(remote);
      try { localStorage.setItem(key, JSON.stringify(remote)); } catch { /* PostgreSQL has the saves. */ }
      setSlotLoading(false);
      setSaveStatus("");
    }).catch(() => {
      if (controller.signal.aborted) return;
      setLoadFailed(true);
      setSaveStatus("Could not load cloud saves. Retry to continue.");
    });
    return () => controller.abort();
  }, [accountId, key, attempt]);

  function retryLoad() {
    setLoadFailed(false);
    setAttempt((value) => value + 1);
  }

  function selectSlot(nextSlot: number) {
    try { localStorage.setItem(key + ":slot", String(nextSlot)); } catch { /* Selection works for this visit. */ }
    setSlot(nextSlot);
  }

  function save(next: Progress) {
    if (slotLoading) return;
    const progress = {
      ...next,
      visited: [...new Set([...(next.visited ?? []), ...next.badges, next.planet])],
    };
    setSavedSlots((current) => ({ ...current, [slot]: progress }));
    pending.current.set(slot, progress);
    setSaveStatus("Syncing progress…");
    void flushSaves();
  }

  return {
    progress: savedSlots[slot] ?? emptySave, savedSlots, slot, selectSlot, saveStatus,
    slotLoading, loadFailed, retryLoad, save, flushSaves, syncFailed,
  };
}
