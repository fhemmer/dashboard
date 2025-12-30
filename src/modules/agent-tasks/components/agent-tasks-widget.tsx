import { getAgentTasksSummary } from "../actions";
import { AgentTasksWidgetClient } from "./agent-tasks-widget-client";

/**
 * Agent Tasks Widget
 * Server component that fetches data and renders the client widget
 */
export async function AgentTasksWidget() {
  const summary = await getAgentTasksSummary();

  return (
    <AgentTasksWidgetClient
      recentRuns={summary.recentRuns}
      totalRuns={summary.totalRuns}
      runningCount={summary.runningCount}
      totalCost={summary.totalCost}
    />
  );
}
