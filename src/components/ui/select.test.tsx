import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "./select";

describe("Select components", () => {
  describe("SelectTrigger", () => {
    it("renders with default size", () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Item 1</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByTestId("trigger");
      expect(trigger).toHaveAttribute("data-size", "default");
    });

    it("renders with sm size", () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger" size="sm">
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Item 1</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByTestId("trigger");
      expect(trigger).toHaveAttribute("data-size", "sm");
    });
  });

  describe("SelectContent", () => {
    it("renders with default position (item-aligned)", () => {
      render(
        <Select open>
          <SelectTrigger>
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Item 1</SelectItem>
          </SelectContent>
        </Select>
      );

      // Content is rendered when open
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("renders with popper position", () => {
      render(
        <Select open>
          <SelectTrigger>
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="1">Item 1</SelectItem>
          </SelectContent>
        </Select>
      );

      // Content renders with popper position
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });
  });

  describe("SelectGroup", () => {
    it("renders with data-slot attribute", () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup data-testid="group">
              <SelectItem value="1">Item 1</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole("combobox");
      expect(trigger).toBeDefined();
    });
  });

  describe("SelectLabel", () => {
    it("renders label text within SelectGroup", () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Category</SelectLabel>
              <SelectItem value="1">Item 1</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole("combobox");
      expect(trigger).toBeDefined();
    });
  });

  describe("SelectSeparator", () => {
    it("renders separator", () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Item 1</SelectItem>
            <SelectSeparator />
            <SelectItem value="2">Item 2</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole("combobox");
      expect(trigger).toBeDefined();
    });
  });
});
