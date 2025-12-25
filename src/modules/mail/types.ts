/**
 * Mail Module Types
 * Comprehensive type definitions for the Mail integration
 */

// ============================================================================
// Provider Types
// ============================================================================

export type MailProvider = "outlook" | "gmail" | "imap";

// ============================================================================
// Account Types
// ============================================================================

export interface MailAccount {
  id: string;
  userId: string;
  provider: MailProvider;
  accountName: string;
  emailAddress: string;
  isEnabled: boolean;
  syncFrequencyMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MailAccountInput {
  provider: MailProvider;
  accountName: string;
  emailAddress: string;
  isEnabled?: boolean;
  syncFrequencyMinutes?: number;
}

// ============================================================================
// Token Types
// ============================================================================

export interface EncryptedToken {
  id: string;
  accountId: string;
  encryptedAccessToken: string;
  encryptedRefreshToken: string | null;
  tokenExpiresAt: Date | null;
  iv: string;
  authTag: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DecryptedToken {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
}

export interface TokenInput {
  accountId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
}

// ============================================================================
// Message Types
// ============================================================================

export interface MailMessage {
  id: string;
  accountId: string;
  provider: MailProvider;
  subject: string;
  from: MailAddress;
  to: MailAddress[];
  cc?: MailAddress[];
  receivedAt: Date;
  isRead: boolean;
  hasAttachments: boolean;
  preview: string;
  importance?: "low" | "normal" | "high";
  conversationId?: string;
}

export interface MailAddress {
  name?: string;
  email: string;
}

export interface MailMessageDetail extends MailMessage {
  body: string;
  bodyPreview: string;
  attachments?: MailAttachment[];
}

export interface MailAttachment {
  id: string;
  name: string;
  size: number;
  contentType: string;
}

// ============================================================================
// Folder Types
// ============================================================================

export type MailFolderType = "inbox" | "sent" | "drafts" | "junk" | "trash" | "archive";

export interface MailFolder {
  id: string;
  displayName: string;
  type: MailFolderType;
  unreadCount: number;
  totalCount: number;
}

// ============================================================================
// Summary Types
// ============================================================================

export interface MailAccountSummary {
  accountId: string;
  accountName: string;
  provider: MailProvider;
  emailAddress: string;
  unreadCount: number;
  totalCount: number;
  lastSyncedAt?: Date;
}

export interface MailSummary {
  accounts: MailAccountSummary[];
  totalUnread: number;
  error?: string;
}

// ============================================================================
// Action Types
// ============================================================================

export type BulkActionType = "markRead" | "markUnread" | "moveToJunk" | "delete";

export interface BulkActionRequest {
  accountId: string;
  messageIds: string[];
  action: BulkActionType;
}

export interface BulkActionResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  error?: string;
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchRequest {
  accountId: string;
  query: string;
  folder?: MailFolderType;
  maxResults?: number;
}

export interface SearchResult {
  messages: MailMessage[];
  hasMore: boolean;
  error?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface AccountsResult {
  accounts: MailAccount[];
  error?: string;
}

export interface MessagesResult {
  messages: MailMessage[];
  hasMore: boolean;
  error?: string;
}

export interface UpdateResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// OAuth Types
// ============================================================================

export interface OAuthCallbackParams {
  code: string;
  state: string;
  provider: MailProvider;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

// ============================================================================
// Cache Key Helpers
// ============================================================================

export function getMailSummaryCacheKey(userId: string): string {
  return `mail:summary:${userId}`;
}

export function getMailMessagesCacheKey(accountId: string, folder: string = "inbox"): string {
  return `mail:messages:${accountId}:${folder}`;
}

export function getMailAccountCacheKey(accountId: string): string {
  return `mail:account:${accountId}`;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function formatMailAddress(address: MailAddress): string {
  if (address.name) {
    return `${address.name} <${address.email}>`;
  }
  return address.email;
}

export function getProviderDisplayName(provider: MailProvider): string {
  switch (provider) {
    case "outlook":
      return "Outlook";
    case "gmail":
      return "Gmail";
    case "imap":
      return "IMAP";
  }
}

export function getProviderColor(provider: MailProvider): string {
  switch (provider) {
    case "outlook":
      return "blue";
    case "gmail":
      return "red";
    case "imap":
      return "gray";
  }
}
