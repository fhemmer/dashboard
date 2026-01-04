import { GitPullRequest, Mail, Newspaper, Timer, Wallet } from "lucide-react";
import type { WidgetDefinition, WidgetId } from "./types";

/**
 * The widget registry - single source of truth for all dashboard widgets.
 * Add new widgets here to make them available in the dashboard.
 */
export const WIDGET_REGISTRY: Record<WidgetId, WidgetDefinition> = {
  "pull-requests": {
    id: "pull-requests",
    name: "Pull Requests",
    description: "GitHub PRs across your connected accounts",
    icon: GitPullRequest,
    defaultEnabled: true,
    minWidth: 1,
    minHeight: 2,
    defaultWidth: 1,
    defaultHeight: 2,
  },
  news: {
    id: "news",
    name: "News",
    description: "Latest updates from your RSS sources",
    icon: Newspaper,
    defaultEnabled: true,
    minWidth: 1,
    minHeight: 2,
    defaultWidth: 1,
    defaultHeight: 2,
  },
  expenditures: {
    id: "expenditures",
    name: "Expenditures",
    description: "Track subscriptions and consumption costs",
    icon: Wallet,
    requiresAdmin: true,
    defaultEnabled: true,
    minWidth: 2,
    minHeight: 1,
    defaultWidth: 2,
    defaultHeight: 1,
  },
  timers: {
    id: "timers",
    name: "Timers",
    description: "Countdown timers with alerts",
    icon: Timer,
    defaultEnabled: true,
    minWidth: 1,
    minHeight: 2,
    defaultWidth: 1,
    defaultHeight: 2,
  },
  mail: {
    id: "mail",
    name: "Mail",
    description: "Email summaries from Outlook, Gmail, and IMAP accounts",
    icon: Mail,
    defaultEnabled: true,
    minWidth: 1,
    minHeight: 2,
    defaultWidth: 1,
    defaultHeight: 2,
  },
};

/**
 * Get all widgets as an ordered array.
 */
export function getAllWidgets(): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY);
}

/**
 * Get widgets available to the current user.
 */
export function getAvailableWidgets(isAdmin: boolean): WidgetDefinition[] {
  return getAllWidgets().filter(
    (widget) => !widget.requiresAdmin || isAdmin
  );
}

/**
 * Get a specific widget definition by ID.
 */
export function getWidgetById(id: WidgetId): WidgetDefinition | undefined {
  return WIDGET_REGISTRY[id];
}
