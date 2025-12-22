import type { PullRequest } from "../types";

const GITHUB_API_BASE = "https://api.github.com";

interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubPRItem[];
}

interface GitHubPRItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  draft: boolean;
  created_at: string;
  updated_at: string;
  repository_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
}

interface GitHubRepo {
  full_name: string;
  html_url: string;
}

function mapPRItem(item: GitHubPRItem, repo: GitHubRepo): PullRequest {
  return {
    id: item.id,
    number: item.number,
    title: item.title,
    htmlUrl: item.html_url,
    state: item.state,
    draft: item.draft,
    createdAt: new Date(item.created_at),
    updatedAt: new Date(item.updated_at),
    repository: {
      fullName: repo.full_name,
      htmlUrl: repo.html_url,
    },
    user: {
      login: item.user.login,
      avatarUrl: item.user.avatar_url,
    },
    labels: item.labels.map((l) => ({ name: l.name, color: l.color })),
  };
}

async function fetchWithAuth(url: string, token: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    next: { revalidate: 120 }, // 2-minute cache
  });
}

async function getRepoFromUrl(
  repoUrl: string,
  token: string
): Promise<GitHubRepo> {
  const response = await fetchWithAuth(repoUrl, token);
  if (!response.ok) {
    throw new Error(`Failed to fetch repo: ${response.statusText}`);
  }
  const data = await response.json();
  return { full_name: data.full_name, html_url: data.html_url };
}

async function searchPRs(
  query: string,
  token: string
): Promise<PullRequest[]> {
  const url = `${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=50`;
  const response = await fetchWithAuth(url, token);

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const data: GitHubSearchResponse = await response.json();

  // Fetch repo info for each PR (deduplicated)
  const repoUrls = [...new Set(data.items.map((item) => item.repository_url))];
  const repoMap = new Map<string, GitHubRepo>();

  await Promise.all(
    repoUrls.map(async (repoUrl) => {
      try {
        const repo = await getRepoFromUrl(repoUrl, token);
        repoMap.set(repoUrl, repo);
      } catch {
        // If we can't fetch repo info, use a fallback
        const parts = repoUrl.split("/");
        repoMap.set(repoUrl, {
          full_name: `${parts[parts.length - 2]}/${parts[parts.length - 1]}`,
          html_url: repoUrl.replace("api.github.com/repos", "github.com"),
        });
      }
    })
  );

  return data.items.map((item) =>
    mapPRItem(item, repoMap.get(item.repository_url)!)
  );
}

export async function fetchReviewRequestedPRs(
  username: string,
  token: string
): Promise<PullRequest[]> {
  const query = `type:pr state:open review-requested:${username}`;
  return searchPRs(query, token);
}

export async function fetchCreatedPRs(
  username: string,
  token: string
): Promise<PullRequest[]> {
  const query = `type:pr state:open author:${username}`;
  return searchPRs(query, token);
}

export async function fetchAllOpenPRs(
  username: string,
  token: string
): Promise<PullRequest[]> {
  // All open PRs where user is involved (author, assignee, mentions, or review-requested)
  const query = `type:pr state:open involves:${username}`;
  return searchPRs(query, token);
}

export async function fetchGitHubUser(
  token: string
): Promise<{ id: number; login: string; avatar_url: string }> {
  const response = await fetchWithAuth(`${GITHUB_API_BASE}/user`, token);
  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub user: ${response.statusText}`);
  }
  return response.json();
}
