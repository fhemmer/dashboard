import { cn } from "@/lib/utils";
import { GitPullRequest } from "lucide-react";
import type { PullRequest } from "../types";

interface PRItemProps {
  pr: PullRequest;
  compact?: boolean;
}

export function PRItem({ pr, compact = false }: PRItemProps) {
  return (
    <a
      href={pr.htmlUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-accent transition-colors text-sm group",
        compact && "py-1"
      )}
    >
      <GitPullRequest
        className={cn(
          "h-4 w-4 shrink-0",
          pr.draft
            ? "text-muted-foreground"
            : "text-green-600 dark:text-green-500"
        )}
      />
      <span className="truncate flex-1 group-hover:text-primary transition-colors">
        {pr.repository.fullName}#{pr.number} {pr.title}
      </span>
      {pr.labels.length > 0 && !compact && (
        <div className="flex gap-1 shrink-0">
          {pr.labels.slice(0, 2).map((label) => (
            <span
              key={label.name}
              className="px-1.5 py-0.5 text-xs rounded-full"
              style={{
                backgroundColor: `#${label.color}20`,
                color: `#${label.color}`,
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}
