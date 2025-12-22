import { PRWidget } from "@/modules/github-prs";
import { NewsWidget } from "@/modules/news";

export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Your personal dashboard overview.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <PRWidget />
        <NewsWidget />
      </div>
    </div>
  );
}
