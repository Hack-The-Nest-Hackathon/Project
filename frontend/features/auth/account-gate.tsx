"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import styles from "./account-gate.module.css";
import { getAccount, loginUrl, logout, type Account } from "../../lib/api/auth";
import { ApiError } from "../../lib/api/client";
import PixelIcon from "../../components/pixel-icon";
import { clearSaveCache } from "../saves/use-save-slot";

const accountContext = createContext<{ account: Account; signOut: () => Promise<void> } | null>(null);
const sessionChanged = "voices-session-changed";

export function useAccount() {
  const context = useContext(accountContext);
  if (!context) throw new Error("Account context is unavailable");
  return context;
}

export default function AccountGate({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [phase, setPhase] = useState<"checking" | "signed-out" | "unavailable">("checking");
  const [attempt, setAttempt] = useState(0);
  const [loginMessage, setLoginMessage] = useState("");
  const [launching, setLaunching] = useState(false);
  const reducedMotion = useReducedMotion();
  const lookup = useRef<AbortController | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("login");
    if (result) {
      const messages: Record<string, string> = {
        unavailable: "Sign-in is temporarily unavailable.",
        origin: "Sign-in is unavailable at this address.",
        expired: "This sign-in attempt expired or its browser cookie is missing. Start again from this address.",
        provider: "SSOJet could not complete this sign-in. Try again.",
        client: "SSOJet rejected the game's client credentials. Check the backend configuration.",
        callback: "SSOJet rejected this callback address. Check the callback registered for this site.",
        pkce: "SSOJet could not verify this sign-in attempt. Start again from this browser tab.",
        grant: "SSOJet rejected the authorization code. Start a fresh sign-in from this page.",
        session: "SSOJet accepted your sign-in, but the game could not save your session. Try again shortly.",
      };
      setLoginMessage(Object.hasOwn(messages, result) ? messages[result] : "Sign-in did not finish. Please try again.");
      const url = new URL(window.location.href);
      url.searchParams.delete("login");
      window.history.replaceState(window.history.state, "", url);
    }
  }, []);

  useEffect(() => {
    async function check() {
      lookup.current?.abort();
      const controller = new AbortController();
      lookup.current = controller;
      try {
        const current = await getAccount(controller.signal);
        if (!controller.signal.aborted) setAccount(current);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          setAccount(null);
          setPhase("signed-out");
        } else {
          setPhase("unavailable");
        }
      }
    }

    function invalidate() {
      setAccount(null);
      setPhase("checking");
      void check();
    }
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      setLaunching(false);
      void check();
    }
    function onStorage(event: StorageEvent) {
      if (event.key === sessionChanged) invalidate();
    }

    void check();
    window.addEventListener(sessionChanged, invalidate);
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      lookup.current?.abort();
      window.removeEventListener(sessionChanged, invalidate);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [attempt]);

  const lastAccountId = useRef<string | null>(null);
  useEffect(() => {
    if (lastAccountId.current && lastAccountId.current !== account?.id) clearSaveCache(lastAccountId.current);
    lastAccountId.current = account?.id ?? null;
  }, [account?.id]);

  useEffect(() => {
    if (!account) return;
    const remaining = Math.max(0, Date.parse(account.expiresAt) - Date.now());
    const timer = window.setTimeout(() => {
      clearSaveCache(account.id);
      setAccount(null);
      setPhase("signed-out");
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [account]);

  async function signOut() {
    if (!account) return;
    await logout(account.id);
    lookup.current?.abort();
    clearSaveCache(account.id);
    try { localStorage.setItem(sessionChanged, String(Date.now())); } catch { /* The next session check handles other tabs. */ }
    setLoginMessage("");
    setAccount(null);
    setPhase("signed-out");
  }

  if (account) {
    return <accountContext.Provider key={account.id} value={{ account, signOut }}>{children}</accountContext.Provider>;
  }

  return (
    <main className={styles.observatory}>
      <div className={styles.sky} aria-hidden="true">
        <div className={styles.stars} />
      </div>
      <motion.section className={styles.checkpoint} aria-labelledby="sign-in-title"
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : .24, ease: [0.2, 0.7, 0.2, 1] }}>
        <div className={styles.insignia} aria-hidden="true">
          <img src="/icon-voices-192.png" alt="" width={96} height={96} />
        </div>
        <h1 id="sign-in-title">Voices beyond <span>Stars</span></h1>
        <p className={styles.intro}>Sign in to open your save files and begin exploring.</p>
        <div className={styles.controls}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={phase} className={styles.action}
              initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .16 }}>
              {phase === "checking" ? <p role="status" className={styles.checking}>Checking your expedition pass…</p>
                : phase === "unavailable" ? <button className="game-button primary"
                  onClick={() => { setPhase("checking"); setAttempt((value) => value + 1); }}>
                  <PixelIcon name="retry" /> Retry connection
                </button>
                : <button className="game-button primary" disabled={launching}
                  onClick={() => {
                    setLaunching(true);
                    setLoginMessage("");
                    window.location.assign(loginUrl(window.location.origin));
                  }}>
                  <PixelIcon name="launch" /> {launching ? "Opening SSOJet…" : "Sign in"}
                </button>}
            </motion.div>
          </AnimatePresence>
          {(loginMessage || phase === "unavailable") && <p role="status" className={styles.error}>
            {loginMessage || "The account service is unavailable. Check your connection."}
          </p>}
        </div>
      </motion.section>
    </main>
  );
}
