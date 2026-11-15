import { useCallback, useEffect, useRef, useState } from "react";

export function useGameMusic(track: string) {
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<"off" | "loading" | "playing" | "error">("off");
  const player = useRef<HTMLAudioElement | null>(null);
  const source = useRef("");
  const ducked = useRef(false);

  const play = useCallback((url: string) => {
    if (source.current === url) return;
    const audio = player.current ?? new Audio();
    player.current = audio;
    source.current = url;
    audio.loop = true;
    audio.volume = ducked.current ? .08 : .22;
    setState("loading");
    audio.onplaying = () => { if (source.current === url) setState("playing"); };
    const fail = () => {
      if (source.current !== url) return;
      source.current = "";
      setState("error");
    };
    audio.onerror = fail;
    audio.src = url;
    void audio.play().catch(fail);
  }, []);

  useEffect(() => {
    if (enabled) play(track);
  }, [enabled, play, track]);

  useEffect(() => () => {
    source.current = "";
    const audio = player.current;
    audio?.pause();
    audio?.removeAttribute("src");
    player.current = null;
  }, []);

  const duck = useCallback((quiet: boolean) => {
    ducked.current = quiet;
    if (player.current) player.current.volume = quiet ? .08 : .22;
  }, []);

  function toggle() {
    if (!enabled || state === "error") {
      play(track);
      setEnabled(true);
      return;
    }
    source.current = "";
    const audio = player.current;
    audio?.pause();
    audio?.removeAttribute("src");
    audio?.load();
    setEnabled(false);
    setState("off");
  }

  return { state, toggle, duck };
}
