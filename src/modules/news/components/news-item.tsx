import { Badge } from "@/components/ui/badge";
import {
    defaultSourceIcon,
    getBrandColorClasses,
    sourceIconComponents,
} from "@/modules/news-sources";
import type { NewsItemSource, NewsItem as NewsItemType } from "../types";

interface NewsItemProps {
  readonly item: NewsItemType;
  readonly compact?: boolean;
  readonly isNew?: boolean;
}

const categoryColors: Record<NewsItemType["source"]["category"], string> = {
  tech: "bg-blue-500/10 text-blue-500",
  dev: "bg-green-500/10 text-green-500",
  ai: "bg-purple-500/10 text-purple-500",
  general: "bg-gray-500/10 text-gray-500",
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    }
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface SourceBadgeProps {
  readonly source: NewsItemSource;
}

function SourceBadge({ source }: SourceBadgeProps) {
  const IconComponent =
    sourceIconComponents[source.iconName] ?? defaultSourceIcon;
  const colorClasses = getBrandColorClasses(source.brandColor);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border}`}
    >
      <IconComponent className="h-3.5 w-3.5" />
      {source.name}
    </span>
  );
}

export function NewsItemComponent({
  item,
  compact = false,
  isNew = false,
}: NewsItemProps) {
  if (compact) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block py-3 hover:bg-accent/50 transition-colors -mx-2 px-2 rounded-md"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isNew && (
                <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 h-4 shrink-0">
                  NEW
                </Badge>
              )}
              <p className="text-sm font-medium leading-tight line-clamp-2">
                {item.title}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <SourceBadge source={item.source} />
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(item.publishedAt)}
              </span>
            </div>
          </div>
          <Badge variant="secondary" className={categoryColors[item.source.category]}>
            {item.source.category}
          </Badge>
        </div>
      </a>
    );
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block py-2 px-3 border rounded-lg hover:bg-accent/50 transition-colors ${isNew ? "border-primary/50 bg-primary/5" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isNew && (
              <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 h-4 shrink-0">
                NEW
              </Badge>
            )}
            <h3 className="text-sm font-semibold leading-tight">{item.title}</h3>
          </div>
          {item.summary && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {item.summary}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <SourceBadge source={item.source} />
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(item.publishedAt)}
            </span>
          </div>
        </div>
        <Badge variant="secondary" className={categoryColors[item.source.category]}>
          {item.source.category}
        </Badge>
      </div>
    </a>
  );
}
