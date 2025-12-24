"use client";

import { useEffect, useRef } from "react";
import { markNewsAsRead } from "../actions";

interface AutoMarkAsReadProps {
  readonly newCount: number;
  readonly delayMs?: number;
}

export function AutoMarkAsRead({
  newCount,
  delayMs = 5000,
}: AutoMarkAsReadProps) {
  const hasMarked = useRef(false);

  useEffect(() => {
    if (newCount === 0 || hasMarked.current) {
      return;
    }

    const timer = setTimeout(() => {
      hasMarked.current = true;
      markNewsAsRead();
    }, delayMs);

    return () => clearTimeout(timer);
  }, [newCount, delayMs]);

  return null;
}
