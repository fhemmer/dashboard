import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModelPicker } from "./model-picker";

// Mock the openrouter module
vi.mock("@/lib/openrouter", () => ({
  formatPrice: (price: number) => (price === 0 ? "Free" : `$${price.toFixed(2)}`),
  MODEL_PROVIDERS: {
    anthropic: { id: "anthropic", name: "Anthropic" },
    openai: { id: "openai", name: "OpenAI" },
    google: { id: "google", name: "Google" },
  },
}));

// Mock the actions
vi.mock("../actions", () => ({
  updateHiddenModels: vi.fn().mockResolvedValue({ success: true }),
}));

const mockModels = [
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    description: "Anthropic's balanced model",
    contextLength: 200000,
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    reasoningPricePerMillion: 0,
    inputModalities: ["text"],
    outputModalities: ["text"],
    providerId: "anthropic",
    isFree: false,
    supportsTools: true,
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    description: "OpenAI's multimodal model",
    contextLength: 128000,
    inputPricePerMillion: 5.0,
    outputPricePerMillion: 15.0,
    reasoningPricePerMillion: 0,
    inputModalities: ["text", "image"],
    outputModalities: ["text"],
    providerId: "openai",
    isFree: false,
    supportsTools: true,
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash Exp (Free)",
    description: "Google's free experimental model",
    contextLength: 1000000,
    inputPricePerMillion: 0,
    outputPricePerMillion: 0,
    reasoningPricePerMillion: 0,
    inputModalities: ["text"],
    outputModalities: ["text"],
    providerId: "google",
    isFree: true,
    supportsTools: true,
  },
];

describe("ModelPicker", () => {
  it("renders provider groups alphabetically", () => {
    const onChange = vi.fn();
    render(
      <ModelPicker
        models={mockModels}
        value="anthropic/claude-sonnet-4"
        onChange={onChange}
      />
    );

    expect(screen.getByText("Anthropic")).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("Google")).toBeInTheDocument();

    // Check alphabetical order: Anthropic, Google, OpenAI
    const buttons = screen.getAllByRole("button");
    const providerButtons = buttons.filter(
      (b) =>
        b.textContent?.includes("Anthropic") ||
        b.textContent?.includes("Google") ||
        b.textContent?.includes("OpenAI")
    );
    expect(providerButtons[0]).toHaveTextContent("Anthropic");
    expect(providerButtons[1]).toHaveTextContent("Google");
    expect(providerButtons[2]).toHaveTextContent("OpenAI");
  });

  it("shows model count for each provider", () => {
    const onChange = vi.fn();
    render(
      <ModelPicker
        models={mockModels}
        value="anthropic/claude-sonnet-4"
        onChange={onChange}
      />
    );

    // Each provider should show count - use getAllByText since there are multiple
    const counts = screen.getAllByText("(1)");
    expect(counts.length).toBeGreaterThan(0);
  });

  it("displays selected model details", () => {
    const onChange = vi.fn();
    render(
      <ModelPicker
        models={mockModels}
        value="anthropic/claude-sonnet-4"
        onChange={onChange}
      />
    );

    // Use getAllByText since model name appears in both details and list
    const modelNames = screen.getAllByText("Claude Sonnet 4");
    expect(modelNames.length).toBeGreaterThan(0);
    expect(screen.getByText("Anthropic's balanced model")).toBeInTheDocument();
    expect(screen.getByText("$3.00 / 1M tokens")).toBeInTheDocument();
    expect(screen.getByText("$15.00 / 1M tokens")).toBeInTheDocument();
    expect(screen.getByText("200K tokens")).toBeInTheDocument();
  });

  it("shows FREE badge for free models in details", () => {
    const onChange = vi.fn();
    render(
      <ModelPicker
        models={mockModels}
        value="google/gemini-2.0-flash-exp:free"
        onChange={onChange}
      />
    );

    // Should have FREE badge in details and in list
    const freeBadges = screen.getAllByText("FREE");
    expect(freeBadges.length).toBeGreaterThan(0);
  });

  it("expands provider with selected model by default", () => {
    const onChange = vi.fn();
    render(
      <ModelPicker
        models={mockModels}
        value="anthropic/claude-sonnet-4"
        onChange={onChange}
      />
    );

    // Anthropic's model should be visible (expanded) - appears in both details and list
    const modelNames = screen.getAllByText("Claude Sonnet 4");
    expect(modelNames.length).toBe(2); // Once in details, once in treeview
  });

  it("toggles provider expansion on click", () => {
    const onChange = vi.fn();
    render(
      <ModelPicker
        models={mockModels}
        value="anthropic/claude-sonnet-4"
        onChange={onChange}
      />
    );

    // Click on OpenAI to expand it
    const openaiButton = screen.getByRole("button", { name: /openai/i });
    fireEvent.click(openaiButton);

    // GPT-4o should now be visible
    expect(screen.getByText("GPT-4o")).toBeInTheDocument();
  });

  it("calls onChange when model is selected", () => {
    const onChange = vi.fn();
    render(
      <ModelPicker
        models={mockModels}
        value="anthropic/claude-sonnet-4"
        onChange={onChange}
      />
    );

    // Expand OpenAI
    const openaiButton = screen.getByRole("button", { name: /openai/i });
    fireEvent.click(openaiButton);

    // Select GPT-4o
    const gpt4Button = screen.getByRole("button", { name: /gpt-4o/i });
    fireEvent.click(gpt4Button);

    expect(onChange).toHaveBeenCalledWith("openai/gpt-4o");
  });

  it("disables provider buttons when disabled prop is true", () => {
    const onChange = vi.fn();
    render(
      <ModelPicker
        models={mockModels}
        value="anthropic/claude-sonnet-4"
        onChange={onChange}
        disabled
      />
    );

    // Provider buttons should be disabled (not the filter button)
    const anthropicButton = screen.getByRole("button", { name: /anthropic/i });
    expect(anthropicButton).toBeDisabled();
  });

  it("shows check mark for selected model", () => {
    const onChange = vi.fn();
    render(
      <ModelPicker
        models={mockModels}
        value="anthropic/claude-sonnet-4"
        onChange={onChange}
      />
    );

    // The selected model row should have the check mark (via muted background class)
    const modelButton = screen.getByRole("button", { name: /claude sonnet 4/i });
    expect(modelButton).toHaveClass("bg-muted");
  });

  it("displays pricing for paid models in list", () => {
    const onChange = vi.fn();
    render(
      <ModelPicker
        models={mockModels}
        value="anthropic/claude-sonnet-4"
        onChange={onChange}
      />
    );

    // Expand OpenAI to see pricing
    const openaiButton = screen.getByRole("button", { name: /openai/i });
    fireEvent.click(openaiButton);

    // Should show input/output prices
    expect(screen.getByText("$5.00 / $15.00")).toBeInTheDocument();
  });

  it("shows Free text for free models in list", () => {
    const onChange = vi.fn();
    render(
      <ModelPicker
        models={mockModels}
        value="anthropic/claude-sonnet-4"
        onChange={onChange}
      />
    );

    // Expand Google to see free model
    const googleButton = screen.getByRole("button", { name: /google/i });
    fireEvent.click(googleButton);

    // Free text should appear in the model row
    const freeTexts = screen.getAllByText("Free");
    expect(freeTexts.length).toBeGreaterThan(0);
  });

  it("renders with empty models list", () => {
    const onChange = vi.fn();
    render(<ModelPicker models={[]} value="" onChange={onChange} />);

    // Should show the "All models are hidden" message
    expect(
      screen.getByText(/all models are hidden/i)
    ).toBeInTheDocument();
  });

  it("shows filter models button", () => {
    const onChange = vi.fn();
    render(
      <ModelPicker
        models={mockModels}
        value="anthropic/claude-sonnet-4"
        onChange={onChange}
      />
    );

    expect(screen.getByRole("button", { name: /filter models/i })).toBeInTheDocument();
  });

  it("hides models when hiddenModelIds is provided", () => {
    const onChange = vi.fn();
    render(
      <ModelPicker
        models={mockModels}
        value="anthropic/claude-sonnet-4"
        onChange={onChange}
        hiddenModelIds={["openai/gpt-4o"]}
      />
    );

    // OpenAI provider should not be visible since its only model is hidden
    expect(screen.queryByText("OpenAI")).not.toBeInTheDocument();
  });

  it("shows hidden count badge when models are hidden", () => {
    const onChange = vi.fn();
    render(
      <ModelPicker
        models={mockModels}
        value="anthropic/claude-sonnet-4"
        onChange={onChange}
        hiddenModelIds={["openai/gpt-4o"]}
      />
    );

    expect(screen.getByText("1 hidden")).toBeInTheDocument();
  });

  it("opens settings sheet when filter button is clicked", () => {
    const onChange = vi.fn();
    render(
      <ModelPicker
        models={mockModels}
        value="anthropic/claude-sonnet-4"
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /filter models/i }));

    expect(screen.getByText("Model Visibility")).toBeInTheDocument();
    expect(
      screen.getByText(/toggle which models appear/i)
    ).toBeInTheDocument();
  });
});
