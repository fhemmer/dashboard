"use client";

import { Badge } from "@/components/ui/badge";
import type { NewsSourceCategory } from "../types";
import { getCategoryColorClass, getCategoryLabel } from "../types";

interface CategoryBadgeProps {
  category: NewsSourceCategory;
  className?: string;
}

export function CategoryBadge({ category, className = "" }: CategoryBadgeProps) {
  const colorClass = getCategoryColorClass(category);
  const label = getCategoryLabel(category);

  return (
    <Badge
      variant="secondary"
      className={`${colorClass} ${className}`}
      data-testid="category-badge"
    >
      {label}
    </Badge>
  );
}
