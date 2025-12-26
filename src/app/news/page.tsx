import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    AutoMarkAsRead,
    getNewsItems,
    getNewsLastSeenAt,
    getSourcesWithExclusion,
    MarkAsReadButton,
    NewsItemComponent,
    RefreshButton,
    SourceExclusionSettings,
} from "@/modules/news";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewsPage() {
  const [{ items, error }, lastSeenAt, { sources }] = await Promise.all([
    getNewsItems(),
    getNewsLastSeenAt(),
    getSourcesWithExclusion(),
  ]);

  const newItems = items.filter(
    (item) => !lastSeenAt || item.publishedAt > lastSeenAt
  );
  const newCount = newItems.length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Dashboard</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">News</h1>
            <p className="text-muted-foreground">
              Stay updated with the latest from your sources.
              {newCount > 0 && (
                <span className="ml-2 text-primary font-medium">
                  {newCount} new {newCount === 1 ? "item" : "items"}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SourceExclusionSettings sources={sources} />
          <MarkAsReadButton newCount={newCount} />
          <RefreshButton />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to load news</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-2">
        {items.map((item) => (
          <NewsItemComponent
            key={item.id}
            item={item}
            isNew={!lastSeenAt || item.publishedAt > lastSeenAt}
          />
        ))}
        {items.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No news items available</p>
          </div>
        )}
      </div>

      <AutoMarkAsRead newCount={newCount} />
    </div>
  );
}
