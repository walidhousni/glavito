"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // degrees
  glare?: boolean;
}

export function TiltCard({ children, className, maxTilt = 12, glare = true }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pctX = (x / rect.width) * 2 - 1; // -1 .. 1
    const pctY = (y / rect.height) * 2 - 1; // -1 .. 1
    const rotX = -(pctY * maxTilt);
    const rotY = pctX * maxTilt;
    card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    if (glare) {
      const glareEl = card.querySelector<HTMLDivElement>("[data-glare]");
      if (glareEl) {
        const angle = Math.atan2(pctY, pctX) * (180 / Math.PI) + 180;
        const intensity = Math.max(Math.abs(pctX), Math.abs(pctY));
        glareEl.style.opacity = String(0.35 * intensity);
        glareEl.style.background = `conic-gradient(from ${angle}deg at 50% 50%, rgba(255,255,255,0.35), transparent 60%)`;
      }
    }
  };

  const handleMouseLeave = () => {
    const card = ref.current;
    if (!card) return;
    card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
    const glareEl = card.querySelector<HTMLDivElement>("[data-glare]");
    if (glareEl) glareEl.style.opacity = "0";
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "relative rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white/70 dark:bg-gray-900/60 backdrop-blur will-change-transform transition-transform duration-150", 
          className
        )}
        style={{ transform: "perspective(1000px)" }}
      >
        {children}
        {glare ? (
          <div data-glare className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-150" />
        ) : null}
      </div>
      <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-xl" />
    </div>
  );
}


