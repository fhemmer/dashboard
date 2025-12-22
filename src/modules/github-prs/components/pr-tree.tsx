"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import type { GitHubAccountWithPRs, PRCategoryData } from "../types";
import { PRItem } from "./pr-item";

interface PRTreeProps {
  accounts: GitHubAccountWithPRs[];
  defaultExpanded?: boolean;
}

interface CategoryNodeProps {
  category: PRCategoryData;
  defaultExpanded?: boolean;
}

function CategoryNode({ category, defaultExpanded = false }: CategoryNodeProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-1 px-2 hover:bg-accent rounded-md transition-colors text-sm">
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            isOpen && "rotate-90"
          )}
        />
        <span className="flex-1 text-left">{category.label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {category.items.length}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 border-l pl-2">
          {category.items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 px-2">
              No pull requests
            </p>
          ) : (
            category.items.map((pr) => <PRItem key={pr.id} pr={pr} compact />)
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface AccountNodeProps {
  accountData: GitHubAccountWithPRs;
  defaultExpanded?: boolean;
}

function AccountNode({ accountData, defaultExpanded = true }: AccountNodeProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const { account, categories, error } = accountData;

  const totalPRs = categories.reduce((sum, cat) => sum + cat.items.length, 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 px-2 hover:bg-accent rounded-md transition-colors">
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            isOpen && "rotate-90"
          )}
        />
        <Avatar className="h-5 w-5">
          <AvatarImage src={account.avatarUrl ?? undefined} alt={account.githubUsername} />
          <AvatarFallback className="text-xs">
            {account.githubUsername[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="flex-1 text-left text-sm font-medium">
          {account.accountLabel}
        </span>
        <span className="text-xs text-muted-foreground">
          @{account.githubUsername}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums ml-2">
          {totalPRs}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 border-l pl-2">
          {error ? (
            <p className="text-xs text-destructive py-2 px-2">{error}</p>
          ) : (
            categories.map((category) => (
              <CategoryNode
                key={category.category}
                category={category}
                defaultExpanded={false}
              />
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function PRTree({ accounts, defaultExpanded = true }: PRTreeProps) {
  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No GitHub accounts connected
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {accounts.map((accountData) => (
        <AccountNode
          key={accountData.account.id}
          accountData={accountData}
          defaultExpanded={defaultExpanded}
        />
      ))}
    </div>
  );
}
