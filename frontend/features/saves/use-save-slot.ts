import { useEffect, useRef, useState } from "react";
import { isProgress, loadSaves, saveProgress, type Progress } from "../../lib/api/saves";

const emptySave: Progress = { planet: "market", observed: [], badges: [] };
const storagePrefix = "field-notes-progress-v1";
const activeSlotKey = "field-notes-active-slot";

export function useSaveSlot() {
  const [slot, setSlot] = useState(1);
  const [savedSlots, setSavedSlots] = useState<Partial<Record<number, Progress>>>({});
  const progress = savedSlots[slot] ?? emptySave;
  const [saveStatus, setSaveStatus] = useState("");
  const [slotLoading, setSlotLoading] = useState(true);
  const saveKey = useRef("");
  const queuedSave = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    try {
      const previous = Number(localStorage.getItem(activeSlotKey));
      if (previous === 2 || previous === 3) setSlot(previous);
    } catch { /* Continue with the default slot when storage is unavailable. */ }
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const local: Partial<Record<number, Progress>> = {};
      let remote: Partial<Record<number, Progress>> = {};
      let status = "";
      for (const number of [1, 2, 3]) {
        try {
          const value: unknown = JSON.parse(localStorage.getItem(`${storagePrefix}-${number}`) ?? "null");
          if (isProgress(value)) local[number] = value;
        } catch { /* An unreadable local save can be recovered from the server. */ }
      }

      try {
        saveKey.current ||= localStorage.getItem("field-notes-player") ?? crypto.randomUUID();
        localStorage.setItem("field-notes-player", saveKey.current);
        await queuedSave.current;
        controller.signal.throwIfAborted();
        remote = await loadSaves(saveKey.current, controller.signal);
      } catch {
        status = "Using a local save.";
      }
      if (controller.signal.aborted) return;
      const available = { ...remote, ...local };
      setSavedSlots((current) => ({ ...current, ...available }));
      setSaveStatus(status);
      setSlotLoading(false);
    }
    void load();
    return () => controller.abort();
  }, [slot]);

  function selectSlot(nextSlot: number) {
    if (slot === nextSlot) return;
    try { localStorage.setItem(activeSlotKey, String(nextSlot)); } catch { /* Selection still works in this session. */ }
    setSlotLoading(true);
    setSlot(nextSlot);
  }

  function save(next: Progress) {
    setSavedSlots((current) => ({ ...current, [slot]: next }));
    let localSaved = false;
    try {
      localStorage.setItem(`${storagePrefix}-${slot}`, JSON.stringify(next));
      localSaved = true;
    } catch { /* The server can still store the save. */ }

    const key = saveKey.current;
    const failureMessage = localSaved ? "Using a local save." : "Progress could not be saved.";
    if (!key) {
      setSaveStatus(failureMessage);
      return;
    }
    queuedSave.current = queuedSave.current.then(async () => {
      try {
        await saveProgress(key, slot, next);
        if (mounted.current) setSaveStatus("");
      } catch {
        if (mounted.current) setSaveStatus(failureMessage);
      }
    });
  }

  return { progress, savedSlots, slot, selectSlot, saveStatus, slotLoading, save };
}
