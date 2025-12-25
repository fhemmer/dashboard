"use client";

import { Button } from "@/components/ui/button";
import type { BulkActionType } from "../types";
import { Check, CheckCheck, Trash2, AlertOctagon, Loader2 } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  onAction: (action: BulkActionType) => void;
  onClearSelection: () => void;
  loading?: boolean;
}

/**
 * Bulk Action Bar Component
 * Provides bulk operations for selected messages
 */
export function BulkActionBar({
  selectedCount,
  onAction,
  onClearSelection,
  loading = false,
}: BulkActionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-background border rounded-lg shadow-lg p-4 flex items-center gap-3">
        <span className="text-sm font-medium">{selectedCount} selected</span>
        
        <div className="h-6 w-px bg-border" />
        
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Processing...</span>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAction("markRead")}
              title="Mark as read"
            >
              <Check className="h-4 w-4 mr-1" />
              Read
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAction("markUnread")}
              title="Mark as unread"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Unread
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAction("moveToJunk")}
              title="Move to junk"
            >
              <AlertOctagon className="h-4 w-4 mr-1" />
              Junk
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAction("delete")}
              title="Delete"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
        
        <div className="h-6 w-px bg-border" />
        
        <Button variant="ghost" size="sm" onClick={onClearSelection} disabled={loading}>
          Clear
        </Button>
      </div>
    </div>
  );
}
