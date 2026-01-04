import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import type { WidgetHeight } from "@/lib/widgets";
import { AlertTriangle, Newspaper } from "lucide-react";
import Link from "next/link";
import { getNewsItems } from "../actions";
import { NewsItemComponent } from "./news-item";

interface NewsWidgetProps {
  widgetHeight?: WidgetHeight;
}

/**
 * Calculate how many news items fit in the available widget height.
 * Each row unit is 180px. Card header takes ~72px, padding ~16px.
 * Each compact news item is ~60px.
 */
function calculateMaxItems(widgetHeight: WidgetHeight): number {
  const rowHeight = 180;
  const headerHeight = 72;
  const paddingHeight = 16;
  const itemHeight = 60;
  
  const totalHeight = widgetHeight * rowHeight;
  const contentHeight = totalHeight - headerHeight - paddingHeight;
  const items = Math.floor(contentHeight / itemHeight);
  
  return Math.max(1, items);
}

export async function NewsWidget({ widgetHeight = 2 }: NewsWidgetProps) {
  const { items, error } = await getNewsItems();
  const maxItems = calculateMaxItems(widgetHeight);
  const displayItems = items.slice(0, maxItems);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-start gap-2">
          <Newspaper className="h-4 w-4 text-muted-foreground mt-1" />
          <div>
            <CardTitle>News</CardTitle>
            <CardDescription className="text-xs">Latest updates from your sources</CardDescription>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/news">View All</Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive mb-4">
            <AlertTriangle className="h-4 w-4" />
            <span>Failed to load news</span>
          </div>
        )}
        <div className="divide-y">
          {displayItems.map((item) => (
            <NewsItemComponent key={item.id} item={item} compact />
          ))}
        </div>
        {items.length === 0 && !error && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No news items available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
