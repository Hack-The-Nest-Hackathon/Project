import { useEffect, useRef, useState, type ReactNode } from "react";
import PixelIcon from "./pixel-icon";

export default function NavigationMenu({ children }: { children: ReactNode }) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function closeFromOutside(event: PointerEvent) {
      const menu = disclosure.current;
      if (menu && event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
    }
    function closeFromKeyboard(event: KeyboardEvent) {
      const menu = disclosure.current;
      if (event.key === "Escape" && menu?.open) {
        event.preventDefault();
        menu.open = false;
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("keydown", closeFromKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("keydown", closeFromKeyboard);
    };
  }, [open]);

  return (
    <details ref={disclosure} className="navigation-menu" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary ref={trigger} className="game-button navigation-trigger" aria-label="Menu">
        <PixelIcon name="menu" /><span>Menu</span>
      </summary>
      <div className="navigation-panel" onClick={(event) => {
        const action = event.target instanceof Element ? event.target.closest("a, button") : null;
        if (action && !action.closest("[data-menu-keep-open]")) {
          event.currentTarget.closest("details")?.removeAttribute("open");
          if (action instanceof HTMLButtonElement) trigger.current?.focus();
        }
      }}>
        {children}
      </div>
    </details>
  );
}
