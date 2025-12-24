"use client";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useTransition } from "react";
import { markNewsAsRead } from "../actions";

interface MarkAsReadButtonProps {
  readonly newCount: number;
}

export function MarkAsReadButton({ newCount }: MarkAsReadButtonProps) {
  const [isPending, startTransition] = useTransition();

  if (newCount === 0) {
    return null;
  }

  function handleClick() {
    startTransition(async () => {
      await markNewsAsRead();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      <Check className="h-4 w-4 mr-1" />
      {isPending ? "Marking..." : `Mark ${newCount} as read`}
    </Button>
  );
}
