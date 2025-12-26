import { getAgentRuns } from "@/modules/agent-tasks/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListTodo, Plus, CircleDot } from "lucide-react";
import Link from "next/link";
import { formatCost, getStatusColor, getStatusLabel, calculateRunCost, formatDuration, type AgentRunStatus } from "@/modules/agent-tasks";

function getStatusBadgeVariant(status: AgentRunStatus): "default" | "destructive" | "secondary" {
  if (status === "completed") return "default";
  if (status === "failed") return "destructive";
  return "secondary";
}

/**
 * Agent Tasks Page
 * Lists all background agent task runs
 */
export default async function AgentTasksPage() {
  const { runs, error } = await getAgentRuns();

  const totalCost = runs
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + calculateRunCost(r), 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Tasks</h1>
          <p className="text-muted-foreground">
            Background AI task execution • Total cost: {formatCost(totalCost)}
          </p>
        </div>
        <Button asChild>
          <Link href="/agent-tasks/new">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Link>
        </Button>
      </div>

      {error && (
        <div className="text-center py-8 text-destructive">{error}</div>
      )}

      {runs.length === 0 ? (
        <div className="text-center py-12">
          <ListTodo className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">No agent tasks yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Queue a background task to let AI work on complex prompts
          </p>
          <Button variant="outline" asChild>
            <Link href="/agent-tasks/new">
              <Plus className="h-4 w-4 mr-2" />
              Run Task
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => (
            <Link
              key={run.id}
              href={`/agent-tasks/${run.id}`}
              className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
            >
              <CircleDot className={`h-4 w-4 ${getStatusColor(run.status)} rounded-full flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">
                  {run.prompt.slice(0, 100)}{run.prompt.length > 100 ? "..." : ""}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {run.model.split("/").pop()} • {formatDuration(run.createdAt, run.completedAt)}
                  {run.status === "completed" && ` • ${formatCost(calculateRunCost(run))}`}
                </p>
              </div>
              <Badge variant={getStatusBadgeVariant(run.status)}>
                {getStatusLabel(run.status)}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
