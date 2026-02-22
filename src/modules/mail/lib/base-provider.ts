/**
 * Base Mail Provider
 * Abstract base class for all mail provider implementations
 * Handles common token validation and provides default placeholder implementations
 */

import type {
  BulkActionType,
  MailFolder,
  MailMessage,
  SearchRequest,
  SearchResult,
} from "../types";
import { getToken, isTokenExpired } from "./token-manager";

export interface TokenValidationResult {
  valid: boolean;
  token?: Awaited<ReturnType<typeof getToken>>;
}

/**
 * Abstract base class for mail provider implementations
 * Subclasses only need to override the methods they implement
 */
export abstract class BaseMailProvider {
  protected abstract providerName: string;

  /**
   * Check if this provider is fully implemented
   * Override to return true when API integration is complete
   */
  isImplemented(): boolean {
    return false;
  }

  /**
   * Validate token for an account
   * Common pattern used by all provider methods
   */
  protected async validateToken(
    accountId: string
  ): Promise<TokenValidationResult> {
    const token = await getToken(accountId);
    if (!token || isTokenExpired(token)) {
      return { valid: false };
    }
    return { valid: true, token };
  }

  /**
   * Fetch unread count
   * Override when implementing API integration
   */
  async getUnreadCount(_accountId: string): Promise<number> {
    // Placeholder: return 0 until implemented
    return 0;
  }

  /**
   * Fetch messages from a folder
   * Override when implementing API integration
   */
  async getMessages(
    _accountId: string,
    _folder: string = "inbox",
    _maxResults: number = 50
  ): Promise<MailMessage[]> {
    // Placeholder: return empty array until implemented
    return [];
  }

  /**
   * Perform bulk action on messages
   * Override when implementing API integration
   */
  async performBulkAction(
    _accountId: string,
    messageIds: string[],
    _action: BulkActionType
  ): Promise<{ success: boolean; processedCount: number }> {
    // Placeholder: return success with message count until implemented
    return { success: true, processedCount: messageIds.length };
  }

  /**
   * Search messages
   * Override when implementing API integration
   */
  async searchMessages(_request: SearchRequest): Promise<SearchResult> {
    // Placeholder: return empty results until implemented
    return { messages: [], hasMore: false };
  }

  /**
   * Get folders/labels
   * Override when implementing API integration
   */
  async getFolders(_accountId: string): Promise<MailFolder[]> {
    // Placeholder: return empty array until implemented
    return [];
  }

  /**
   * Helper to log errors with provider context
   */
  protected logError(method: string, error: unknown): void {
    console.error(`Error in ${this.providerName} ${method}:`, error);
  }
}

/**
 * Helper function to wrap provider methods with token validation
 * Extracts accountId from first parameter and validates token before executing
 */
export async function withTokenValidation<T>(
  accountId: string,
  operation: () => Promise<T>,
  defaultValue: T,
  providerName: string,
  methodName: string
): Promise<T> {
  try {
    const token = await getToken(accountId);
    if (!token || isTokenExpired(token)) {
      return defaultValue;
    }
    return await operation();
  } catch (error) {
    console.error(`Error in ${providerName} ${methodName}:`, error);
    return defaultValue;
  }
}

/**
 * Helper function for search operations that take a SearchRequest
 * Special handling: includes error message in result when exception occurs
 */
export async function withSearchTokenValidation(
  request: SearchRequest,
  operation: () => Promise<SearchResult>,
  defaultValue: SearchResult,
  providerName: string,
  methodName: string
): Promise<SearchResult> {
  try {
    const token = await getToken(request.accountId);
    if (!token || isTokenExpired(token)) {
      return defaultValue;
    }
    return await operation();
  } catch (error) {
    console.error(`Error in ${providerName} ${methodName}:`, error);
    return { ...defaultValue, error: String(error) };
  }
}
