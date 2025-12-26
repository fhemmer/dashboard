"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CircleDot, ListTodo, Plus } from "lucide-react";
import Link from "next/link";

import type { AgentRun } from "../types";
import { formatCost, getStatusColor, getStatusLabel } from "../types";

interface AgentTasksWidgetClientProps {
  recentRuns: AgentRun[];
  totalRuns: number;
  runningCount: number;
  totalCost: number;
}

function getTaskCountText(count: number, cost: number): string {
  if (count === 0) return "No tasks yet";
  return `${count} task${count === 1 ? "" : "s"} • ${formatCost(cost)}`;
}

function getStatusBadgeVariant(status: string): "default" | "secondary" {
  return status === "completed" ? "default" : "secondary";
}

/**
 * Agent Tasks Widget Client Component
 * Displays recent agent runs and status
 */
export function AgentTasksWidgetClient({
  recentRuns,
  totalRuns,
  runningCount,
  totalCost,
}: AgentTasksWidgetClientProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-start gap-2">
          <ListTodo className="h-4 w-4 text-muted-foreground mt-1" />
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Agent Tasks</CardTitle>
              {runningCount > 0 && (
                <Badge variant="secondary" className="text-xs tabular-nums animate-pulse">
                  {runningCount} running
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              {getTaskCountText(totalRuns, totalCost)}
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/agent-tasks/new" aria-label="New agent task">
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/agent-tasks">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recentRuns.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              No agent tasks yet
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/agent-tasks/new">
                <Plus className="h-4 w-4 mr-2" />
                Run Task
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentRuns.map((run) => (
              <Link
                key={run.id}
                href={`/agent-tasks/${run.id}`}
                className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CircleDot className={`h-3 w-3 ${getStatusColor(run.status)} rounded-full`} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate max-w-[180px]">
                      {run.prompt.slice(0, 50)}{run.prompt.length > 50 ? "..." : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {run.model.split("/").pop()}
                    </div>
                  </div>
                </div>
                <Badge
                  variant={getStatusBadgeVariant(run.status)}
                  className="text-xs"
                >
                  {getStatusLabel(run.status)}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
