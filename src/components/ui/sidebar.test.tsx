import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupAction,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInput,
    SidebarInset,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSkeleton,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarProvider,
    SidebarRail,
    SidebarSeparator,
    SidebarTrigger,
    useSidebar,
} from "./sidebar";

// Mock useIsMobile hook
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

function TestSidebarConsumer() {
  const sidebar = useSidebar();
  return (
    <div>
      <span data-testid="state">{sidebar.state}</span>
      <span data-testid="open">{String(sidebar.open)}</span>
      <span data-testid="is-mobile">{String(sidebar.isMobile)}</span>
      <button data-testid="toggle" onClick={sidebar.toggleSidebar}>
        Toggle
      </button>
    </div>
  );
}

describe("Sidebar Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.cookie = "";
  });

  describe("SidebarProvider", () => {
    it("provides sidebar context with default expanded state", () => {
      render(
        <SidebarProvider>
          <TestSidebarConsumer />
        </SidebarProvider>
      );

      expect(screen.getByTestId("state")).toHaveTextContent("expanded");
      expect(screen.getByTestId("open")).toHaveTextContent("true");
    });

    it("provides collapsed state when defaultOpen is false", () => {
      render(
        <SidebarProvider defaultOpen={false}>
          <TestSidebarConsumer />
        </SidebarProvider>
      );

      expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
      expect(screen.getByTestId("open")).toHaveTextContent("false");
    });

    it("toggles sidebar state", async () => {
      render(
        <SidebarProvider>
          <TestSidebarConsumer />
        </SidebarProvider>
      );

      expect(screen.getByTestId("state")).toHaveTextContent("expanded");

      await act(async () => {
        fireEvent.click(screen.getByTestId("toggle"));
      });

      expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
    });

    it("supports controlled mode with open and onOpenChange", () => {
      const onOpenChange = vi.fn();

      render(
        <SidebarProvider open={true} onOpenChange={onOpenChange}>
          <TestSidebarConsumer />
        </SidebarProvider>
      );

      expect(screen.getByTestId("open")).toHaveTextContent("true");

      act(() => {
        fireEvent.click(screen.getByTestId("toggle"));
      });

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("renders with data-slot attribute", () => {
      const { container } = render(
        <SidebarProvider>
          <div>Content</div>
        </SidebarProvider>
      );

      expect(
        container.querySelector("[data-slot='sidebar-wrapper']")
      ).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <SidebarProvider className="custom-class">
          <div>Content</div>
        </SidebarProvider>
      );

      expect(
        container.querySelector("[data-slot='sidebar-wrapper']")
      ).toHaveClass("custom-class");
    });

    it("handles keyboard shortcut Ctrl+B", async () => {
      render(
        <SidebarProvider>
          <TestSidebarConsumer />
        </SidebarProvider>
      );

      expect(screen.getByTestId("state")).toHaveTextContent("expanded");

      await act(async () => {
        fireEvent.keyDown(window, { key: "b", ctrlKey: true });
      });

      expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
    });

    it("handles keyboard shortcut Meta+B (Mac)", async () => {
      render(
        <SidebarProvider>
          <TestSidebarConsumer />
        </SidebarProvider>
      );

      expect(screen.getByTestId("state")).toHaveTextContent("expanded");

      await act(async () => {
        fireEvent.keyDown(window, { key: "b", metaKey: true });
      });

      expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
    });

    it("ignores keyboard shortcut without modifier", async () => {
      render(
        <SidebarProvider>
          <TestSidebarConsumer />
        </SidebarProvider>
      );

      expect(screen.getByTestId("state")).toHaveTextContent("expanded");

      await act(async () => {
        fireEvent.keyDown(window, { key: "b" });
      });

      expect(screen.getByTestId("state")).toHaveTextContent("expanded");
    });
  });

  describe("useSidebar", () => {
    it("throws error when used outside SidebarProvider", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => render(<TestSidebarConsumer />)).toThrow(
        "useSidebar must be used within a SidebarProvider."
      );

      consoleError.mockRestore();
    });
  });

  describe("Sidebar", () => {
    it("renders with data-slot attribute", () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>Content</Sidebar>
        </SidebarProvider>
      );

      expect(container.querySelector("[data-slot='sidebar']")).toBeInTheDocument();
    });

    it("renders with collapsible=none as static sidebar", () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar collapsible="none">Content</Sidebar>
        </SidebarProvider>
      );

      const sidebar = container.querySelector("[data-slot='sidebar']");
      expect(sidebar).toHaveClass("bg-sidebar");
      expect(sidebar?.querySelector("[data-slot='sidebar-gap']")).toBeNull();
    });

    it("renders expanded state with data attributes", () => {
      const { container } = render(
        <SidebarProvider defaultOpen={true}>
          <Sidebar>Content</Sidebar>
        </SidebarProvider>
      );

      const sidebar = container.querySelector("[data-slot='sidebar']");
      expect(sidebar).toHaveAttribute("data-state", "expanded");
    });

    it("renders collapsed state with data attributes", () => {
      const { container } = render(
        <SidebarProvider defaultOpen={false}>
          <Sidebar collapsible="icon">Content</Sidebar>
        </SidebarProvider>
      );

      const sidebar = container.querySelector("[data-slot='sidebar']");
      expect(sidebar).toHaveAttribute("data-state", "collapsed");
      expect(sidebar).toHaveAttribute("data-collapsible", "icon");
    });

    it("renders with right side", () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar side="right">Content</Sidebar>
        </SidebarProvider>
      );

      const sidebar = container.querySelector("[data-slot='sidebar']");
      expect(sidebar).toHaveAttribute("data-side", "right");
    });

    it("renders with floating variant", () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar variant="floating">Content</Sidebar>
        </SidebarProvider>
      );

      const sidebar = container.querySelector("[data-slot='sidebar']");
      expect(sidebar).toHaveAttribute("data-variant", "floating");
    });

    it("renders with inset variant", () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar variant="inset">Content</Sidebar>
        </SidebarProvider>
      );

      const sidebar = container.querySelector("[data-slot='sidebar']");
      expect(sidebar).toHaveAttribute("data-variant", "inset");
    });
  });

  describe("SidebarTrigger", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarTrigger data-testid="trigger" />
        </SidebarProvider>
      );

      expect(screen.getByTestId("trigger")).toHaveAttribute(
        "data-slot",
        "sidebar-trigger"
      );
    });

    it("toggles sidebar when clicked", async () => {
      render(
        <SidebarProvider>
          <TestSidebarConsumer />
          <SidebarTrigger data-testid="trigger" />
        </SidebarProvider>
      );

      expect(screen.getByTestId("state")).toHaveTextContent("expanded");

      await act(async () => {
        fireEvent.click(screen.getByTestId("trigger"));
      });

      expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
    });

    it("calls custom onClick handler", async () => {
      const onClick = vi.fn();

      render(
        <SidebarProvider>
          <SidebarTrigger data-testid="trigger" onClick={onClick} />
        </SidebarProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId("trigger"));
      });

      expect(onClick).toHaveBeenCalled();
    });
  });

  describe("SidebarRail", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarRail data-testid="rail" />
        </SidebarProvider>
      );

      expect(screen.getByTestId("rail")).toHaveAttribute(
        "data-slot",
        "sidebar-rail"
      );
    });

    it("toggles sidebar when clicked", async () => {
      render(
        <SidebarProvider>
          <TestSidebarConsumer />
          <SidebarRail data-testid="rail" />
        </SidebarProvider>
      );

      expect(screen.getByTestId("state")).toHaveTextContent("expanded");

      await act(async () => {
        fireEvent.click(screen.getByTestId("rail"));
      });

      expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
    });
  });

  describe("SidebarInset", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarInset data-testid="inset">Content</SidebarInset>
        </SidebarProvider>
      );

      expect(screen.getByTestId("inset")).toHaveAttribute(
        "data-slot",
        "sidebar-inset"
      );
    });

    it("renders as main element", () => {
      render(
        <SidebarProvider>
          <SidebarInset data-testid="inset">Content</SidebarInset>
        </SidebarProvider>
      );

      expect(screen.getByTestId("inset").tagName).toBe("MAIN");
    });
  });

  describe("SidebarInput", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarInput data-testid="input" />
        </SidebarProvider>
      );

      expect(screen.getByTestId("input")).toHaveAttribute(
        "data-slot",
        "sidebar-input"
      );
    });
  });

  describe("SidebarHeader", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarHeader data-testid="header">Header</SidebarHeader>
        </SidebarProvider>
      );

      expect(screen.getByTestId("header")).toHaveAttribute(
        "data-slot",
        "sidebar-header"
      );
    });
  });

  describe("SidebarFooter", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarFooter data-testid="footer">Footer</SidebarFooter>
        </SidebarProvider>
      );

      expect(screen.getByTestId("footer")).toHaveAttribute(
        "data-slot",
        "sidebar-footer"
      );
    });
  });

  describe("SidebarSeparator", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarSeparator data-testid="separator" />
        </SidebarProvider>
      );

      expect(screen.getByTestId("separator")).toHaveAttribute(
        "data-slot",
        "sidebar-separator"
      );
    });
  });

  describe("SidebarContent", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarContent data-testid="content">Content</SidebarContent>
        </SidebarProvider>
      );

      expect(screen.getByTestId("content")).toHaveAttribute(
        "data-slot",
        "sidebar-content"
      );
    });
  });

  describe("SidebarGroup", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarGroup data-testid="group">Group</SidebarGroup>
        </SidebarProvider>
      );

      expect(screen.getByTestId("group")).toHaveAttribute(
        "data-slot",
        "sidebar-group"
      );
    });
  });

  describe("SidebarGroupLabel", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarGroupLabel data-testid="label">Label</SidebarGroupLabel>
        </SidebarProvider>
      );

      expect(screen.getByTestId("label")).toHaveAttribute(
        "data-slot",
        "sidebar-group-label"
      );
    });

    it("renders as Slot when asChild is true", () => {
      render(
        <SidebarProvider>
          <SidebarGroupLabel asChild>
            <span data-testid="child">Label</span>
          </SidebarGroupLabel>
        </SidebarProvider>
      );

      expect(screen.getByTestId("child")).toHaveAttribute(
        "data-slot",
        "sidebar-group-label"
      );
    });
  });

  describe("SidebarGroupAction", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarGroupAction data-testid="action">Action</SidebarGroupAction>
        </SidebarProvider>
      );

      expect(screen.getByTestId("action")).toHaveAttribute(
        "data-slot",
        "sidebar-group-action"
      );
    });

    it("renders as Slot when asChild is true", () => {
      render(
        <SidebarProvider>
          <SidebarGroupAction asChild>
            <span data-testid="child">Action</span>
          </SidebarGroupAction>
        </SidebarProvider>
      );

      expect(screen.getByTestId("child")).toHaveAttribute(
        "data-slot",
        "sidebar-group-action"
      );
    });
  });

  describe("SidebarGroupContent", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarGroupContent data-testid="group-content">
            Content
          </SidebarGroupContent>
        </SidebarProvider>
      );

      expect(screen.getByTestId("group-content")).toHaveAttribute(
        "data-slot",
        "sidebar-group-content"
      );
    });
  });

  describe("SidebarMenu", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarMenu data-testid="menu" />
        </SidebarProvider>
      );

      expect(screen.getByTestId("menu")).toHaveAttribute(
        "data-slot",
        "sidebar-menu"
      );
    });

    it("renders as ul element", () => {
      render(
        <SidebarProvider>
          <SidebarMenu data-testid="menu" />
        </SidebarProvider>
      );

      expect(screen.getByTestId("menu").tagName).toBe("UL");
    });
  });

  describe("SidebarMenuItem", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarMenu>
            <SidebarMenuItem data-testid="item">Item</SidebarMenuItem>
          </SidebarMenu>
        </SidebarProvider>
      );

      expect(screen.getByTestId("item")).toHaveAttribute(
        "data-slot",
        "sidebar-menu-item"
      );
    });

    it("renders as li element", () => {
      render(
        <SidebarProvider>
          <SidebarMenu>
            <SidebarMenuItem data-testid="item">Item</SidebarMenuItem>
          </SidebarMenu>
        </SidebarProvider>
      );

      expect(screen.getByTestId("item").tagName).toBe("LI");
    });
  });

  describe("SidebarMenuButton", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarMenuButton data-testid="button">Button</SidebarMenuButton>
        </SidebarProvider>
      );

      expect(screen.getByTestId("button")).toHaveAttribute(
        "data-slot",
        "sidebar-menu-button"
      );
    });

    it("renders with active state", () => {
      render(
        <SidebarProvider>
          <SidebarMenuButton data-testid="button" isActive>
            Button
          </SidebarMenuButton>
        </SidebarProvider>
      );

      expect(screen.getByTestId("button")).toHaveAttribute("data-active", "true");
    });

    it("renders with size variants", () => {
      const { rerender } = render(
        <SidebarProvider>
          <SidebarMenuButton data-testid="button" size="sm">
            Button
          </SidebarMenuButton>
        </SidebarProvider>
      );

      expect(screen.getByTestId("button")).toHaveAttribute("data-size", "sm");

      rerender(
        <SidebarProvider>
          <SidebarMenuButton data-testid="button" size="lg">
            Button
          </SidebarMenuButton>
        </SidebarProvider>
      );

      expect(screen.getByTestId("button")).toHaveAttribute("data-size", "lg");
    });

    it("renders with tooltip (string)", () => {
      render(
        <SidebarProvider defaultOpen={false}>
          <SidebarMenuButton data-testid="button" tooltip="My Tooltip">
            Button
          </SidebarMenuButton>
        </SidebarProvider>
      );

      expect(screen.getByTestId("button")).toBeInTheDocument();
    });

    it("renders with tooltip (object)", () => {
      render(
        <SidebarProvider defaultOpen={false}>
          <SidebarMenuButton
            data-testid="button"
            tooltip={{ children: "My Tooltip", side: "right" }}
          >
            Button
          </SidebarMenuButton>
        </SidebarProvider>
      );

      expect(screen.getByTestId("button")).toBeInTheDocument();
    });

    it("renders as Slot when asChild is true", () => {
      render(
        <SidebarProvider>
          <SidebarMenuButton asChild>
            <a href="#" data-testid="link">
              Link
            </a>
          </SidebarMenuButton>
        </SidebarProvider>
      );

      const link = screen.getByTestId("link");
      expect(link).toHaveAttribute("data-slot", "sidebar-menu-button");
      expect(link.tagName).toBe("A");
    });

    it("renders with outline variant", () => {
      render(
        <SidebarProvider>
          <SidebarMenuButton data-testid="button" variant="outline">
            Button
          </SidebarMenuButton>
        </SidebarProvider>
      );

      expect(screen.getByTestId("button")).toHaveClass("bg-background");
    });
  });

  describe("SidebarMenuAction", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarMenuAction data-testid="action">Action</SidebarMenuAction>
        </SidebarProvider>
      );

      expect(screen.getByTestId("action")).toHaveAttribute(
        "data-slot",
        "sidebar-menu-action"
      );
    });

    it("renders as Slot when asChild is true", () => {
      render(
        <SidebarProvider>
          <SidebarMenuAction asChild>
            <span data-testid="child">Action</span>
          </SidebarMenuAction>
        </SidebarProvider>
      );

      expect(screen.getByTestId("child")).toHaveAttribute(
        "data-slot",
        "sidebar-menu-action"
      );
    });

    it("applies showOnHover class when prop is true", () => {
      render(
        <SidebarProvider>
          <SidebarMenuAction data-testid="action" showOnHover>
            Action
          </SidebarMenuAction>
        </SidebarProvider>
      );

      expect(screen.getByTestId("action")).toHaveClass("md:opacity-0");
    });
  });

  describe("SidebarMenuBadge", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarMenuBadge data-testid="badge">5</SidebarMenuBadge>
        </SidebarProvider>
      );

      expect(screen.getByTestId("badge")).toHaveAttribute(
        "data-slot",
        "sidebar-menu-badge"
      );
    });
  });

  describe("SidebarMenuSkeleton", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarMenuSkeleton data-testid="skeleton" />
        </SidebarProvider>
      );

      expect(screen.getByTestId("skeleton")).toHaveAttribute(
        "data-slot",
        "sidebar-menu-skeleton"
      );
    });

    it("renders with icon when showIcon is true", () => {
      const { container } = render(
        <SidebarProvider>
          <SidebarMenuSkeleton data-testid="skeleton" showIcon />
        </SidebarProvider>
      );

      const iconSkeleton = container.querySelector(
        "[data-sidebar='menu-skeleton-icon']"
      );
      expect(iconSkeleton).toBeInTheDocument();
    });

    it("does not render icon when showIcon is false", () => {
      const { container } = render(
        <SidebarProvider>
          <SidebarMenuSkeleton data-testid="skeleton" showIcon={false} />
        </SidebarProvider>
      );

      const iconSkeleton = container.querySelector(
        "[data-sidebar='menu-skeleton-icon']"
      );
      expect(iconSkeleton).toBeNull();
    });
  });

  describe("SidebarMenuSub", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarMenuSub data-testid="sub" />
        </SidebarProvider>
      );

      expect(screen.getByTestId("sub")).toHaveAttribute(
        "data-slot",
        "sidebar-menu-sub"
      );
    });

    it("renders as ul element", () => {
      render(
        <SidebarProvider>
          <SidebarMenuSub data-testid="sub" />
        </SidebarProvider>
      );

      expect(screen.getByTestId("sub").tagName).toBe("UL");
    });
  });

  describe("SidebarMenuSubItem", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarMenuSub>
            <SidebarMenuSubItem data-testid="sub-item">Item</SidebarMenuSubItem>
          </SidebarMenuSub>
        </SidebarProvider>
      );

      expect(screen.getByTestId("sub-item")).toHaveAttribute(
        "data-slot",
        "sidebar-menu-sub-item"
      );
    });

    it("renders as li element", () => {
      render(
        <SidebarProvider>
          <SidebarMenuSub>
            <SidebarMenuSubItem data-testid="sub-item">Item</SidebarMenuSubItem>
          </SidebarMenuSub>
        </SidebarProvider>
      );

      expect(screen.getByTestId("sub-item").tagName).toBe("LI");
    });
  });

  describe("SidebarMenuSubButton", () => {
    it("renders with data-slot attribute", () => {
      render(
        <SidebarProvider>
          <SidebarMenuSubButton data-testid="sub-button">
            Button
          </SidebarMenuSubButton>
        </SidebarProvider>
      );

      expect(screen.getByTestId("sub-button")).toHaveAttribute(
        "data-slot",
        "sidebar-menu-sub-button"
      );
    });

    it("renders with active state", () => {
      render(
        <SidebarProvider>
          <SidebarMenuSubButton data-testid="sub-button" isActive>
            Button
          </SidebarMenuSubButton>
        </SidebarProvider>
      );

      expect(screen.getByTestId("sub-button")).toHaveAttribute(
        "data-active",
        "true"
      );
    });

    it("renders with size variants", () => {
      const { rerender } = render(
        <SidebarProvider>
          <SidebarMenuSubButton data-testid="sub-button" size="sm">
            Button
          </SidebarMenuSubButton>
        </SidebarProvider>
      );

      expect(screen.getByTestId("sub-button")).toHaveAttribute("data-size", "sm");

      rerender(
        <SidebarProvider>
          <SidebarMenuSubButton data-testid="sub-button" size="md">
            Button
          </SidebarMenuSubButton>
        </SidebarProvider>
      );

      expect(screen.getByTestId("sub-button")).toHaveAttribute("data-size", "md");
    });

    it("renders as Slot when asChild is true", () => {
      render(
        <SidebarProvider>
          <SidebarMenuSubButton asChild>
            <a href="#" data-testid="link">
              Link
            </a>
          </SidebarMenuSubButton>
        </SidebarProvider>
      );

      const link = screen.getByTestId("link");
      expect(link).toHaveAttribute("data-slot", "sidebar-menu-sub-button");
      expect(link.tagName).toBe("A");
    });
  });
});
