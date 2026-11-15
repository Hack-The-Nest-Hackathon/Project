"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { createContext, useContext, useState, type ReactNode } from "react";
import PixelIcon from "../../components/pixel-icon";

type Destination = "/" | "/about";
const BriefingNavigation = createContext<((href: Destination) => void) | null>(null);
const shutterTiming = { duration: .34, ease: "easeInOut" } as const;

export function BriefingTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [destination, setDestination] = useState<Destination | null>(null);
  const revealing = destination !== null && pathname === destination;

  return (
    <BriefingNavigation.Provider value={(href) => setDestination((pending) => pending ?? href)}>
      {children}
      {destination && (
        <motion.div className="briefing-transition" role="status"
          onAnimationComplete={() => {
            if (revealing) setDestination(null);
            else router.push(destination);
          }}
          initial={{ opacity: .65 }} animate={{ opacity: revealing ? 0 : 1 }}
          transition={{ duration: revealing ? .4 : .46 }}>
          <motion.div aria-hidden="true" className="briefing-shutter briefing-shutter-top"
            initial={{ y: "-100%" }} animate={{ y: revealing ? "-100%" : 0 }} transition={shutterTiming} />
          <motion.div aria-hidden="true" className="briefing-shutter briefing-shutter-bottom"
            initial={{ y: "100%" }} animate={{ y: revealing ? "100%" : 0 }} transition={shutterTiming} />
          <motion.p initial={{ opacity: 0, scale: .95 }} animate={{ opacity: revealing ? 0 : 1, scale: 1 }}
            transition={{ duration: .2, delay: revealing ? 0 : .15 }}>
            <PixelIcon name={destination === "/about" ? "journal" : "launch"} />
            {destination === "/about" ? "Opening mission briefing" : "Returning to the title screen"}
          </motion.p>
        </motion.div>
      )}
    </BriefingNavigation.Provider>
  );
}

export default function BriefingLink({ href, className, children }: {
  href: Destination; className: string; children: ReactNode;
}) {
  const navigate = useContext(BriefingNavigation);
  const reducedMotion = useReducedMotion();

  return (
    <Link href={href} className={className} onNavigate={(event) => {
      if (!navigate || reducedMotion) return;
      event.preventDefault();
      navigate(href);
    }}>
      {children}
    </Link>
  );
}
