import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type FormEvent } from "react";
import PixelIcon from "../../components/pixel-icon";
import { loadFriends, updateFriend, type FriendsData, type FriendAction } from "../../lib/api/friends";

const tabs = ["Friends", "Requests", "Leaderboard"] as const;
const friendCode = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export default function FriendsPanel({ accountId, reducedMotion, close }: {
  accountId: string; reducedMotion: boolean | null; close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const mutation = useRef<AbortController | null>(null);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Friends");
  const [data, setData] = useState<FriendsData | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const incoming = data?.friends.filter(({ status }) => status === "incoming") ?? [];
  const sent = data?.friends.filter(({ status }) => status === "sent") ?? [];
  const friends = data?.friends.filter(({ status }) => status === "friend") ?? [];
  const leaderboard = data?.leaderboard ?? [];

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      mutation.current?.abort();
      element?.close();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadFriends(accountId, controller.signal).then((next) => {
      if (controller.signal.aborted) return;
      setData(next);
      setLoadError("");
    }).catch(() => {
      if (!controller.signal.aborted) setLoadError("Could not refresh the crew list.");
    });
    return () => controller.abort();
  }, [accountId, attempt, tab]);

  async function change(id: string, action: FriendAction) {
    if (mutation.current) return;
    const controller = new AbortController();
    mutation.current = controller;
    setBusy(true);
    setMessage("");
    try {
      await updateFriend(accountId, id, action, controller.signal);
      if (controller.signal.aborted) return;
      if (action === "send") setCode("");
      if (action === "accept") setData((current) => current && {
        ...current, friends: current.friends.map((friend) => friend.id === id ? { ...friend, status: "friend" } : friend),
      });
      if (action === "decline") setData((current) => current && {
        ...current, friends: current.friends.filter((friend) => friend.id !== id),
      });
      setMessage(action === "send" ? "Friend request sent." : action === "accept" ? "Explorer added to your crew." : "Request declined.");
      setAttempt((value) => value + 1);
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Could not update the request.");
    } finally {
      mutation.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = code.trim();
    if (!friendCode.test(id)) { setMessage("Enter a complete friend code."); return; }
    void change(id, "send");
  }

  const rowMotion = {
    initial: reducedMotion ? false : { opacity: 0, x: -8 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0 },
    transition: { duration: reducedMotion ? 0 : .18 },
  };

  return (
    <dialog ref={dialog} className="crew-dialog" aria-labelledby="crew-title" onCancel={(event) => {
      event.preventDefault();
      close();
    }} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <motion.div className="crew-content" initial={reducedMotion ? false : { opacity: 0, y: 14, scale: .98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reducedMotion ? 0 : .22 }}>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="crew-title" className="screen-heading">Explorer crew</h2>
          <button className="game-button" onClick={close}>Close</button>
        </header>
        <nav className="crew-tabs" aria-label="Explorer crew sections">
          {tabs.map((option) => (
            <button type="button" key={option} className={clsx("game-button", option === tab && "primary")}
              aria-pressed={option === tab} onClick={() => setTab(option)}>
              {option}{option === "Requests" && incoming.length > 0 ? ` (${incoming.length})` : ""}
            </button>
          ))}
        </nav>
        <AnimatePresence mode="wait" initial={false}>
          <motion.section key={tab} {...rowMotion} className="grid gap-3" aria-label={tab}>
            {tab === "Friends" && <>
              <div className="crew-code">
                <div className="min-w-0"><p className="field-label">Your friend code</p><code>{accountId}</code></div>
                <button type="button" className="game-button" onClick={async () => {
                  try { await navigator.clipboard.writeText(accountId); setMessage("Friend code copied."); }
                  catch { setMessage("Select the code to copy it manually."); }
                }}>Copy</button>
              </div>
              <form className="crew-add" onSubmit={send}>
                <label htmlFor="friend-code" className="field-label">Add by friend code</label>
                <input id="friend-code" placeholder="Paste a friend code" value={code} maxLength={40}
                  autoComplete="off" spellCheck={false} onChange={(event) => setCode(event.target.value)} />
                <button type="submit" className="game-button primary" disabled={busy || !code.trim()}>Send request</button>
              </form>
              {data && (friends.length ? <ul className="crew-list">
                {friends.map(({ id, name }) => <li key={id}><PixelIcon name="profile" /> <strong>{name}</strong></li>)}
              </ul> : <p className="field-label">Your crew is empty. Share your code to find a friend.</p>)}
            </>}
            {tab === "Requests" && data && <>
              <h3>Incoming</h3>
              {incoming.length ? <ul className="crew-list">
                <AnimatePresence initial={false}>{incoming.map(({ id, name }) => (
                  <motion.li key={id} {...rowMotion}>
                    <strong>{name}</strong>
                    <div className="flex flex-wrap gap-2">
                      <button className="game-button primary" disabled={busy} onClick={() => void change(id, "accept")}
                        aria-label={`Accept request from ${name}`}>Accept</button>
                      <button className="game-button" disabled={busy} onClick={() => void change(id, "decline")}
                        aria-label={`Decline request from ${name}`}>Decline</button>
                    </div>
                  </motion.li>
                ))}</AnimatePresence>
              </ul> : <p className="field-label">No incoming requests.</p>}
              <h3>Sent</h3>
              {sent.length ? <ul className="crew-list">
                {sent.map(({ id, name }) => <li key={id}><strong>{name}</strong><span className="field-label">Pending</span></li>)}
              </ul> : <p className="field-label">No requests waiting for a reply.</p>}
            </>}
            {tab === "Leaderboard" && data && <>
              <p className="field-label">Ranked by unique badges, then journal clues across all save slots.</p>
              <ol className="crew-list crew-rankings">
                {leaderboard.map(({ id, name, badges, clues }) => {
                  const firstTie = leaderboard.findIndex((entry) => entry.badges === badges && entry.clues === clues);
                  return <motion.li key={id} {...rowMotion} layout={!reducedMotion} className={clsx(id === accountId && "crew-self")}>
                    <span className="crew-rank" aria-label={`Rank ${firstTie + 1}`}>#{firstTie + 1}</span>
                    <strong>{name}{id === accountId ? " (you)" : ""}</strong>
                    <span className="crew-score">{badges} {badges === 1 ? "badge" : "badges"} · {clues} {clues === 1 ? "clue" : "clues"}</span>
                  </motion.li>;
                })}
              </ol>
              {!friends.length && <p className="field-label">Accepted friends appear here.</p>}
            </>}
          </motion.section>
        </AnimatePresence>
        {!data && !loadError && <p role="status" className="field-label">Loading your crew.</p>}
        <footer className="flex flex-wrap items-center justify-between gap-2">
          <p className="field-label" role="status">{message || loadError}</p>
          <button type="button" className="game-button" disabled={busy} onClick={() => setAttempt((value) => value + 1)}>
            <PixelIcon name="retry" /> Refresh
          </button>
        </footer>
      </motion.div>
    </dialog>
  );
}
