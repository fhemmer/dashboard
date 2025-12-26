import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, Newspaper } from "lucide-react";
import Link from "next/link";
import { getNewsItems } from "../actions";
import { NewsItemComponent } from "./news-item";

interface NewsWidgetProps {
  maxItems?: number;
}

export async function NewsWidget({ maxItems = 3 }: NewsWidgetProps) {
  const { items, error } = await getNewsItems();
  const displayItems = items.slice(0, maxItems);

  return (
    <Card>
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
      <CardContent>
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
