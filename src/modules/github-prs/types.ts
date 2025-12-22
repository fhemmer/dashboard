export interface GitHubAccount {
  id: string;
  userId: string;
  githubUserId: number;
  githubUsername: string;
  avatarUrl: string | null;
  accountLabel: string;
  createdAt: Date;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  htmlUrl: string;
  state: "open" | "closed";
  draft: boolean;
  createdAt: Date;
  updatedAt: Date;
  repository: {
    fullName: string;
    htmlUrl: string;
  };
  user: {
    login: string;
    avatarUrl: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
}

export type PRCategory = "review-requested" | "created" | "all-open";

export interface PRCategoryData {
  category: PRCategory;
  label: string;
  items: PullRequest[];
}

export interface GitHubAccountWithPRs {
  account: GitHubAccount;
  categories: PRCategoryData[];
  error?: string;
}

export interface FetchPRsResult {
  accounts: GitHubAccountWithPRs[];
  errors: Array<{ accountId: string; message: string }>;
}
