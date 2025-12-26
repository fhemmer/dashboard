"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteNewsSource, toggleNewsSourceActive } from "../actions";
import { defaultSourceIcon, sourceIconComponents } from "../icons";
import type { NewsSource, UserRole } from "../types";
import { getBrandColorClass } from "../types";
import { CategoryBadge } from "./category-badge";
import { SourceForm } from "./source-form";

function updateSourceActive(sources: NewsSource[], sourceId: string): NewsSource[] {
  return sources.map((s) =>
    s.id === sourceId ? { ...s, isActive: !s.isActive } : s
  );
}

function removeSource(sources: NewsSource[], sourceId: string): NewsSource[] {
  return sources.filter((s) => s.id !== sourceId);
}

interface SourceListProps {
  initialSources: NewsSource[];
  userRole: UserRole;
  userId: string;
}

export function SourceList({ initialSources, userRole, userId }: SourceListProps) {
  const [sources, setSources] = useState(initialSources);
  const [editingSource, setEditingSource] = useState<NewsSource | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canEditSource = (source: NewsSource) => {
    return userRole === "admin" || source.createdBy === userId;
  };

  const canDeleteSource = (source: NewsSource) => {
    return userRole === "admin" || source.createdBy === userId;
  };

  const performToggle = async (source: NewsSource) => {
    const result = await toggleNewsSourceActive(source.id, !source.isActive);
    if (result.success) {
      setSources((prev) => updateSourceActive(prev, source.id));
    }
  };

  const handleToggleActive = (source: NewsSource) => {
    startTransition(() => performToggle(source));
  };

  const performDelete = async (source: NewsSource) => {
    const result = await deleteNewsSource(source.id);
    if (result.success) {
      setSources((prev) => removeSource(prev, source.id));
    }
  };

  const handleDelete = (source: NewsSource) => {
    if (!confirm(`Are you sure you want to delete "${source.name}"?`)) {
      return;
    }
    startTransition(() => performDelete(source));
  };

  const handleAddSuccess = () => {
    setIsAddDialogOpen(false);
    window.location.reload();
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditingSource(null);
    window.location.reload();
  };

  const openEditDialog = (source: NewsSource) => {
    setEditingSource(source);
    setIsEditDialogOpen(true);
  };

  const closeAddDialog = () => setIsAddDialogOpen(false);

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingSource(null);
  };

  return (
    <div className="space-y-4" data-testid="source-list">
      <div className="flex justify-end">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add News Source</DialogTitle>
            </DialogHeader>
            <SourceForm
              onSuccess={handleAddSuccess}
              onCancel={closeAddDialog}
            />
          </DialogContent>
        </Dialog>
      </div>

      {sources.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No news sources found. Add your first source to get started.
        </div>
      ) : (
        <SourceTable
          sources={sources}
          isPending={isPending}
          canEditSource={canEditSource}
          canDeleteSource={canDeleteSource}
          onToggleActive={handleToggleActive}
          onEdit={openEditDialog}
          onDelete={handleDelete}
        />
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit News Source</DialogTitle>
          </DialogHeader>
          {editingSource && (
            <SourceForm
              source={editingSource}
              onSuccess={handleEditSuccess}
              onCancel={closeEditDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SourceTableProps {
  sources: NewsSource[];
  isPending: boolean;
  canEditSource: (source: NewsSource) => boolean;
  canDeleteSource: (source: NewsSource) => boolean;
  onToggleActive: (source: NewsSource) => void;
  onEdit: (source: NewsSource) => void;
  onDelete: (source: NewsSource) => void;
}

function SourceTable({
  sources,
  isPending,
  canEditSource,
  canDeleteSource,
  onToggleActive,
  onEdit,
  onDelete,
}: SourceTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>URL</TableHead>
            <TableHead className="w-20">Status</TableHead>
            <TableHead className="w-32 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((source) => (
            <SourceTableRow
              key={source.id}
              source={source}
              isPending={isPending}
              canEdit={canEditSource(source)}
              canDelete={canDeleteSource(source)}
              onToggleActive={() => onToggleActive(source)}
              onEdit={() => onEdit(source)}
              onDelete={() => onDelete(source)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface SourceTableRowProps {
  source: NewsSource;
  isPending: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SourceTableRow({
  source,
  isPending,
  canEdit,
  canDelete,
  onToggleActive,
  onEdit,
  onDelete,
}: SourceTableRowProps) {
  const IconComponent = sourceIconComponents[source.iconName] ?? defaultSourceIcon;
  const colorClass = getBrandColorClass(source.brandColor);

  return (
    <TableRow
      className={!source.isActive ? "opacity-50" : ""}
      data-testid={`source-row-${source.id}`}
    >
      <TableCell>
        <div className={`p-1.5 rounded-md ${colorClass} text-white inline-flex`}>
          <IconComponent className="h-4 w-4" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{source.name}</TableCell>
      <TableCell>
        <CategoryBadge category={source.category} />
      </TableCell>
      <TableCell>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm truncate max-w-[200px]"
        >
          {source.url}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      </TableCell>
      <TableCell>
        <button
          onClick={onToggleActive}
          disabled={isPending || !canEdit}
          className={`text-xs px-2 py-1 rounded-full ${
            source.isActive
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
          } ${canEdit ? "cursor-pointer hover:opacity-80" : "cursor-not-allowed"}`}
        >
          {source.isActive ? "Active" : "Inactive"}
        </button>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex gap-1 justify-end">
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              disabled={isPending}
              aria-label={`Edit ${source.name}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              disabled={isPending}
              aria-label={`Delete ${source.name}`}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
