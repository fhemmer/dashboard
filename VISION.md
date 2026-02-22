# Dashboard Vision

## Core Concept

The dashboard is a **unified command center** for monitoring and interacting with various services, tools, and workflows. Each feature exists in two forms:

| Term | Description |
|------|-------------|
| **Widget** | Compact card on the dashboard showing a summary/preview |
| **Page** | Full-screen dedicated view with complete functionality |

## Feature Categories

### 1. Insights (Informational)

Read-only features that surface information from external sources.

| Feature | Status | Description | Data Sources |
|---------|--------|-------------|--------------|
| News | ✅ Complete | Aggregated news/updates | RSS feeds |
| PR Status | ✅ Complete | Pull request activity | GitHub API |
| Usage | Planned | Resource consumption stats | Supabase, Vercel, GitHub Copilot, OpenRouter |
| Notifications | Planned | System alerts | Windows, custom |
| Mail | Planned | Email summaries | Outlook, Gmail |

### 2. Actions (Utilities)

Interactive features that trigger operations or workflows.

| Feature | Status | Description | Capabilities |
|---------|--------|-------------|--------------|
| Conductor | Planned | Event-driven multi-agent orchestration | AI Agents, Automation, Scheduling |
| Agent Runner | Planned | Trigger agentic workflows | Custom automation |
| AI Chat | Planned | Conversational interface | OpenAI, Anthropic |
| Quick Actions | Planned | One-click operations | Various integrations |

---

## Conductor: Multi-Agent Orchestration System

**Conductor** is an event-driven framework for orchestrating AI agents to perform complex, multi-step automation tasks.

### Technology Choice: Inngest

The event backbone uses **Inngest** (already configured in this project):

| Capability | Inngest Feature |
|------------|-----------------|
| Event publishing | `inngest.send()` |
| Event handling | `inngest.createFunction()` |
| Scheduling | Native cron support |
| Concurrency | `concurrency: { limit: 3 }` |
| Retries | Built-in with exponential backoff |
| Observability | Inngest Dashboard |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CONDUCTOR                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐    ┌──────────────┐                                      │
│   │  Conductor   │    │   Schedule   │                                      │
│   │    Agent     │    │    Agent     │                                      │
│   │  (Front UI)  │    │  (Inngest)   │                                      │
│   └──────┬───────┘    └──────┬───────┘                                      │
│          │                   │                                              │
│          │    ┌──────────────▼──────────────┐                               │
│          └────►      INNGEST EVENTS         ◄────┐                          │
│               │   (Event Bus + Queue)       │    │                          │
│          ┌────►                             ◄────┼────┐                     │
│          │    └──────────────┬──────────────┘    │    │                     │
│          │                   │                   │    │                     │
│   ┌──────┴───────┐    ┌──────▼───────┐    ┌─────┴────▼─────┐               │
│   │   Planner    │    │    Task      │    │    Worker      │               │
│   │    Agent     │    │   Manager    │    │    Agents      │               │
│   │              │    │    Agent     │    │   (max: 3)     │               │
│   └──────────────┘    └──────────────┘    └────────────────┘               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `maxConcurrentWorkers` | 3 | Maximum parallel task executions |
| `approvalMode` | `"auto"` | `"auto"` \| `"always"` \| `"dangerous-only"` |
| `retryAttempts` | 3 | Max retries for failed tasks |
| `taskTimeout` | 300s | Max time per task before timeout |

### Folder Structure

Plans, tasks, results, and assets are kept together per plan instance:

```
src/modules/conductor/
  templates/                           # Reusable plan templates
    TODAYS-NEWS.template.md
    WEEKLY-REPORT.template.md
  runs/                                # Plan execution instances
    TODAYS-NEWS-2026-01-27/
      PLAN.md                          # Plan manifest
      tasks/
        TASK-001-fetch-rss.md
        TASK-002-fetch-reddit.md
        TASK-003-fetch-hackernews.md
        TASK-004-aggregate.md
        TASK-005-summarize.md
      results/
        RESULT.md                      # Final output
      assets/
        rss-raw.json
        reddit-raw.json
        hackernews-raw.json
        aggregated.json
```

### Core Components

| Component | Role | Responsibilities |
|-----------|------|------------------|
| **Conductor Agent** | Front UI | User interaction, plan submission, status monitoring, manual approvals |
| **Schedule Agent** | Timing | Inngest cron functions, template instantiation, recurring plan triggers |
| **Planner Agent** | Planning | Accepts goals, decomposes into structured plans with dependencies |
| **Task Manager Agent** | Orchestration | Dependency resolution, worker dispatch, status tracking, retries |
| **Worker Agents** | Execution | Specialized workers (max 3 concurrent) |
| **Events** | Communication | Inngest event bus connecting all agents |

### Event Types

| Event | Emitter | Consumers | Description |
|-------|---------|-----------|-------------|
| `conductor/plan.requested` | Conductor UI | Planner Agent | User submits a new goal/request |
| `conductor/plan.created` | Planner Agent | Task Manager | Plan instantiated and ready |
| `conductor/plan.approved` | Conductor UI | Task Manager | Human approved plan execution |
| `conductor/task.ready` | Task Manager | Worker Agents | Task dependencies satisfied, ready for execution |
| `conductor/task.claimed` | Worker Agent | Task Manager | Worker claimed a task |
| `conductor/task.progress` | Worker Agent | Conductor UI | Progress update for display |
| `conductor/task.completed` | Worker Agent | Task Manager | Task finished successfully |
| `conductor/task.failed` | Worker Agent | Task Manager | Task failed, may trigger retry |
| `conductor/plan.completed` | Task Manager | Conductor UI | All tasks in plan finished |
| `conductor/schedule.triggered` | Schedule Agent | Planner Agent | Scheduled template activation |

### Worker Agent Specializations

| Worker Type | Capabilities |
|-------------|--------------|
| **Fetch Worker** | HTTP requests, API calls, RSS parsing |
| **Code Worker** | Write, refactor, and test code |
| **File Worker** | Create, move, delete files and directories |
| **Browser Worker** | Web automation, scraping, form filling |
| **AI Worker** | LLM calls for summarization, analysis, generation |
| **Database Worker** | Query and mutate database records |

### Plan Template Format

**Template (`templates/TODAYS-NEWS.template.md`):**
```markdown
# Template: Today's News

## Metadata
- Template-ID: TODAYS-NEWS
- Schedule: "0 6 * * *"  # Daily at 6 AM
- Approval: auto
- Version: 1.0

## Description
Fetches news from multiple sources, aggregates, and produces a daily digest.

## Tasks

### TASK-001: Fetch RSS Feeds
- Worker: fetch-worker
- Depends-On: none
- Config:
  - sources: [techcrunch, hackernews, verge]
- Output: assets/rss-raw.json

### TASK-002: Fetch Reddit
- Worker: fetch-worker
- Depends-On: none
- Config:
  - subreddits: [technology, programming]
- Output: assets/reddit-raw.json

### TASK-003: Fetch Hacker News
- Worker: fetch-worker
- Depends-On: none
- Config:
  - endpoint: top-stories
  - limit: 30
- Output: assets/hackernews-raw.json

### TASK-004: Aggregate Sources
- Worker: file-worker
- Depends-On: [TASK-001, TASK-002, TASK-003]
- Input: [assets/rss-raw.json, assets/reddit-raw.json, assets/hackernews-raw.json]
- Output: assets/aggregated.json

### TASK-005: Summarize & Rank
- Worker: ai-worker
- Depends-On: [TASK-004]
- Config:
  - model: gpt-4o-mini
  - prompt: "Rank and summarize the top 10 stories"
- Input: assets/aggregated.json
- Output: results/RESULT.md

## Result Schema
- Format: markdown
- Sections: [top-stories, by-category, trending]
```

### Plan Instance Format

**Instance (`runs/TODAYS-NEWS-2026-01-27/PLAN.md`):**
```markdown
# Plan: Today's News - 2026-01-27

## Metadata
- Plan-ID: TODAYS-NEWS-2026-01-27
- Template: TODAYS-NEWS
- Status: in-progress
- Created: 2026-01-27T06:00:00Z
- Trigger: schedule

## Progress
| Task | Status | Worker | Started | Completed |
|------|--------|--------|---------|-----------|
| TASK-001 | ✅ completed | fetch-worker-01 | 06:00:01 | 06:00:05 |
| TASK-002 | ✅ completed | fetch-worker-02 | 06:00:01 | 06:00:08 |
| TASK-003 | ✅ completed | fetch-worker-03 | 06:00:01 | 06:00:06 |
| TASK-004 | 🔄 in-progress | file-worker-01 | 06:00:09 | — |
| TASK-005 | ⏳ pending | — | — | — |

## Dependency Graph
```
TASK-001 ──┐
TASK-002 ──┼──► TASK-004 ──► TASK-005 ──► RESULT
TASK-003 ──┘
```

## Event Log
- 06:00:00 `conductor/schedule.triggered` template=TODAYS-NEWS
- 06:00:01 `conductor/plan.created` plan-id=TODAYS-NEWS-2026-01-27
- 06:00:01 `conductor/task.ready` task=TASK-001,TASK-002,TASK-003
- ...
```

### Cross-Plan Dependencies

Plans can depend on other plans:

```markdown
## Plan Dependencies
- Depends-On-Plans: [WEEKLY-METRICS-2026-W04]
- Wait-For: plan.completed
```

### Implementation Phases

| Phase | Scope | Status |
|-------|-------|--------|
| **POC** | Today's News plan with Inngest events | 🎯 Next |
| **Phase 1** | Core event handlers + Task Manager | Planned |
| **Phase 2** | Fetch Worker + File Worker | Planned |
| **Phase 3** | AI Worker + plan templates | Planned |
| **Phase 4** | Conductor UI (widget + page) | Planned |
| **Phase 5** | Schedule Agent + recurring plans | Planned |
| **Phase 6** | Approval gates + cross-plan deps | Planned |

### POC: Today's News

The proof-of-concept will validate the architecture:

1. **Template**: `TODAYS-NEWS.template.md` with 5 tasks
2. **Events**: Wire up Inngest functions for core events
3. **Workers**: Implement Fetch Worker and AI Worker
4. **Result**: Generate `/runs/TODAYS-NEWS-{date}/results/RESULT.md`

**Success Criteria:**
- [ ] Schedule triggers plan instantiation
- [ ] Parallel tasks (001-003) execute concurrently (max 3)
- [ ] Task 004 waits for 001-003 to complete
- [ ] Task 005 produces final RESULT.md
- [ ] All state persisted in markdown files

### Widget Preview

The Conductor widget will show:
- Active plans count with status breakdown
- Currently running tasks (0-3 workers busy)
- Recent completions/failures
- Quick action to trigger a template

### Page Features

The Conductor page (`/conductor`) will provide:
- Template library with trigger buttons
- Plan queue with approval controls
- Real-time task execution view (dependency graph)
- Event stream viewer (debugging)
- Worker status dashboard (3 slots)
- Execution history and run browser

---

## Vocabulary

| Term | Definition |
|------|------------|
| **Widget** | A compact, dashboard-mounted component showing summarized data |
| **Page** | A dedicated route with the full feature experience |
| **Insight** | An informational feature (read-only) |
| **Action** | A utility feature (interactive/mutating) |
| **Module** | A complete feature encompassing both widget and page |

## Architecture Pattern

Each **Module** consists of:

```
src/
  modules/
    <module-name>/           # Module directory
      components/
        <name>-widget.tsx    # Widget component
        <name>-item.tsx      # Item component
      actions.ts             # Server actions
      types.ts               # TypeScript types
      lib/                   # Module-specific utilities
  app/
    <module-name>/
      page.tsx               # Full page route
```

The dashboard home page imports and renders widgets from each module.

## Implementation Roadmap

### Phase 1: Foundation ✅
- [x] Establish module structure
- [x] Create base UI components (Card, Button, Badge, etc.)
- [x] Define shared types for widgets
- [x] Set up theming system (4 themes: default, ocean, forest, sunset)
- [x] Implement Supabase authentication
- [x] Configure 100% test coverage requirement

### Phase 2: News Module ✅
- [x] News widget (dashboard card)
- [x] News page (full view at `/news`)
- [x] RSS feed parsing with real data sources
- [x] News item components
- [x] Refresh functionality

### Phase 3: GitHub PRs Module ✅
- [x] PR widget (dashboard card)
- [x] PR page (full view at `/prs`)
- [x] GitHub API integration
- [x] PR tree view (grouped by repository)
- [x] PR item components

### Phase 4: Additional Modules
- [ ] Conductor module (event-driven multi-agent orchestration)
- [ ] Usage stats module
- [ ] Notifications module
- [ ] Mail module

## Design Principles

1. **Progressive Disclosure**: Widgets show essentials; pages reveal details
2. **Consistency**: All modules follow the same structure
3. **Independence**: Modules are self-contained and can be enabled/disabled
4. **Real-time Ready**: Architecture supports live updates via Supabase Realtime or polling
5. **100% Test Coverage**: All code must have complete test coverage

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Frontend | Next.js 16+ (App Router) |
| UI | shadcn/ui + Tailwind CSS 4 |
| Database/Auth | Supabase Cloud |
| Deployment | Vercel |
| Testing | Vitest + Testing Library |

## Current Status

- **Modules Complete**: 2 (News, GitHub PRs)
- **Test Coverage**: 100%
- **Themes Available**: 4 (default, ocean, forest, sunset)
- **Active Routes**: `/`, `/news`, `/prs`, `/login`, `/signup`, `/account`

---

*Last updated: 2026-01-27*
