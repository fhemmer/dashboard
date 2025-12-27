"use client";

/**
 * Conversation List Item Component
 * Displays a single conversation with rename, archive, and delete actions
 */

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMessageDate } from "@/modules/chat";
import { archiveConversation, deleteConversation, updateConversation } from "@/modules/chat/actions";
import { Archive, MessageSquare, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { ChatConversation } from "@/modules/chat/types";

interface ConversationListItemProps {
  readonly conversation: ChatConversation;
}

export function ConversationListItem({
  conversation,
}: ConversationListItemProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [title, setTitle] = useState(conversation.title ?? "");

  function handleRename() {
    startTransition(async () => {
      await updateConversation(conversation.id, { title: title || undefined });
      setShowRenameDialog(false);
      router.refresh();
    });
  }

  function handleArchive() {
    startTransition(async () => {
      await archiveConversation(conversation.id);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteConversation(conversation.id);
      setShowDeleteDialog(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent transition-colors group">
        <Link
          href={`/chat/${conversation.id}`}
          className="flex items-center gap-4 flex-1 min-w-0"
        >
          <MessageSquare className="h-8 w-8 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">
              {conversation.title ?? "New Chat"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {conversation.model.split("/").pop()} • {formatMessageDate(conversation.updatedAt)}
            </p>
          </div>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowRenameDialog(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleArchive}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription>
              Give this conversation a meaningful name.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title..."
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRename();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRenameDialog(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
