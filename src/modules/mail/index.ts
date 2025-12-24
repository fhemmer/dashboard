/**
 * Mail Module
 * Comprehensive mail integration supporting Outlook, Gmail, and IMAP
 */

export type {
  BulkActionRequest,
  BulkActionResult,
  BulkActionType,
  DecryptedToken,
  EncryptedToken,
  MailAccount,
  MailAccountInput,
  MailAccountSummary,
  MailAddress,
  MailAttachment,
  MailFolder,
  MailFolderType,
  MailMessage,
  MailMessageDetail,
  MailProvider,
  MailSummary,
  MessagesResult,
  OAuthCallbackParams,
  OAuthTokenResponse,
  SearchRequest,
  SearchResult,
  TokenInput,
  UpdateResult,
} from "./types";

export {
  formatMailAddress,
  getMailAccountCacheKey,
  getMailMessagesCacheKey,
  getMailSummaryCacheKey,
  getProviderColor,
  getProviderDisplayName,
} from "./types";
