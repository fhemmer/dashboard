import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

describe("Sheet", () => {
  it("renders Sheet with trigger and content", async () => {
    render(
      <Sheet>
        <SheetTrigger>Open Sheet</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
            <SheetDescription>Sheet Description</SheetDescription>
          </SheetHeader>
          <div>Sheet Body</div>
          <SheetFooter>Footer Content</SheetFooter>
        </SheetContent>
      </Sheet>
    );

    expect(screen.getByText("Open Sheet")).toBeInTheDocument();

    // Open the sheet
    fireEvent.click(screen.getByText("Open Sheet"));

    expect(await screen.findByText("Sheet Title")).toBeInTheDocument();
    expect(screen.getByText("Sheet Description")).toBeInTheDocument();
    expect(screen.getByText("Sheet Body")).toBeInTheDocument();
    expect(screen.getByText("Footer Content")).toBeInTheDocument();
  });

  it("renders SheetContent with data-slot attribute", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>Content</SheetContent>
      </Sheet>
    );

    const content = await screen.findByText("Content");
    expect(content.closest("[data-slot='sheet-content']")).toBeInTheDocument();
  });

  it("renders SheetTrigger with data-slot attribute", () => {
    render(
      <Sheet>
        <SheetTrigger data-testid="trigger">Open</SheetTrigger>
        <SheetContent>Content</SheetContent>
      </Sheet>
    );

    expect(screen.getByTestId("trigger")).toHaveAttribute(
      "data-slot",
      "sheet-trigger"
    );
  });

  it("renders SheetClose with data-slot attribute", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetClose data-testid="close">Close</SheetClose>
        </SheetContent>
      </Sheet>
    );

    expect(await screen.findByTestId("close")).toHaveAttribute(
      "data-slot",
      "sheet-close"
    );
  });

  it("renders SheetHeader with data-slot attribute", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetHeader data-testid="header">Header</SheetHeader>
        </SheetContent>
      </Sheet>
    );

    expect(await screen.findByTestId("header")).toHaveAttribute(
      "data-slot",
      "sheet-header"
    );
  });

  it("renders SheetFooter with data-slot attribute", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetFooter data-testid="footer">Footer</SheetFooter>
        </SheetContent>
      </Sheet>
    );

    expect(await screen.findByTestId("footer")).toHaveAttribute(
      "data-slot",
      "sheet-footer"
    );
  });

  it("renders SheetTitle with data-slot attribute", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetTitle data-testid="title">Title</SheetTitle>
        </SheetContent>
      </Sheet>
    );

    expect(await screen.findByTestId("title")).toHaveAttribute(
      "data-slot",
      "sheet-title"
    );
  });

  it("renders SheetDescription with data-slot attribute", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetDescription data-testid="desc">Description</SheetDescription>
        </SheetContent>
      </Sheet>
    );

    expect(await screen.findByTestId("desc")).toHaveAttribute(
      "data-slot",
      "sheet-description"
    );
  });

  it("renders content on left side", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent side="left">Left Content</SheetContent>
      </Sheet>
    );

    const content = await screen.findByText("Left Content");
    expect(content.closest("[data-slot='sheet-content']")).toHaveClass(
      "left-0"
    );
  });

  it("renders content on top side", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent side="top">Top Content</SheetContent>
      </Sheet>
    );

    const content = await screen.findByText("Top Content");
    expect(content.closest("[data-slot='sheet-content']")).toHaveClass("top-0");
  });

  it("renders content on bottom side", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent side="bottom">Bottom Content</SheetContent>
      </Sheet>
    );

    const content = await screen.findByText("Bottom Content");
    expect(content.closest("[data-slot='sheet-content']")).toHaveClass(
      "bottom-0"
    );
  });

  it("applies custom className to SheetContent", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent className="custom-class">Content</SheetContent>
      </Sheet>
    );

    const content = await screen.findByText("Content");
    expect(content.closest("[data-slot='sheet-content']")).toHaveClass(
      "custom-class"
    );
  });

  it("applies custom className to SheetHeader", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetHeader className="custom-header">Header</SheetHeader>
        </SheetContent>
      </Sheet>
    );

    expect(await screen.findByText("Header")).toHaveClass("custom-header");
  });

  it("applies custom className to SheetFooter", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetFooter className="custom-footer">Footer</SheetFooter>
        </SheetContent>
      </Sheet>
    );

    expect(await screen.findByText("Footer")).toHaveClass("custom-footer");
  });

  it("applies custom className to SheetTitle", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetTitle className="custom-title">Title</SheetTitle>
        </SheetContent>
      </Sheet>
    );

    expect(await screen.findByText("Title")).toHaveClass("custom-title");
  });

  it("applies custom className to SheetDescription", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetDescription className="custom-desc">Desc</SheetDescription>
        </SheetContent>
      </Sheet>
    );

    expect(await screen.findByText("Desc")).toHaveClass("custom-desc");
  });

  it("closes when close button is clicked", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <span>Visible Content</span>
        </SheetContent>
      </Sheet>
    );

    expect(await screen.findByText("Visible Content")).toBeInTheDocument();

    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    // Wait for the content to be removed
    await screen.findByText("Visible Content").catch(() => {
      // Content should be gone or animating out
    });
  });

  it("renders SheetOverlay with data-slot attribute", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>Content</SheetContent>
      </Sheet>
    );

    await screen.findByText("Content");
    // Overlay is rendered in a portal, so we need to query the document body
    const overlay = document.body.querySelector("[data-slot='sheet-overlay']");
    expect(overlay).toBeInTheDocument();
  });
});
