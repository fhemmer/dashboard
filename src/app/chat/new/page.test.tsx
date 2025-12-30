import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewChatPage from "./page";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock chat actions
vi.mock("@/modules/chat/actions", () => ({
  createConversation: vi.fn(),
  getAvailableModelsWithPricing: vi.fn().mockResolvedValue([
    {
      id: "openrouter/anthropic/claude-3",
      name: "Claude 3",
      description: "Test model",
      contextLength: 200000,
      inputPricePerMillion: 3.0,
      outputPricePerMillion: 15.0,
      reasoningPricePerMillion: 0,
      inputModalities: ["text"],
      outputModalities: ["text"],
      providerId: "openrouter",
      isFree: false,
      supportsTools: true,
    },
    {
      id: "openrouter/openai/gpt-4",
      name: "GPT-4",
      description: "Test model",
      contextLength: 128000,
      inputPricePerMillion: 5.0,
      outputPricePerMillion: 15.0,
      reasoningPricePerMillion: 0,
      inputModalities: ["text"],
      outputModalities: ["text"],
      providerId: "openrouter",
      isFree: false,
      supportsTools: true,
    },
  ]),
  getHiddenModels: vi.fn().mockResolvedValue({ hiddenModels: [] }),
  updateHiddenModels: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock agent lib
vi.mock("@/lib/agent", () => ({
  DEFAULT_MODEL: "openrouter/anthropic/claude-3",
}));

// Mock openrouter lib
vi.mock("@/lib/openrouter", () => ({
  formatPrice: (price: number) => price === 0 ? "Free" : `$${price.toFixed(2)}`,
  MODEL_PROVIDERS: {
    openrouter: { id: "openrouter", name: "OpenRouter" },
  },
}));

import { createConversation } from "@/modules/chat/actions";

const mockCreateConversation = vi.mocked(createConversation);

describe("NewChatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page header", () => {
    render(<NewChatPage />);

    expect(screen.getByRole("heading", { name: /new chat/i })).toBeInTheDocument();
    expect(screen.getByText(/configure your ai conversation settings/i)).toBeInTheDocument();
  });

  it("renders chat settings card", async () => {
    render(<NewChatPage />);

    expect(screen.getByText("Chat Settings")).toBeInTheDocument();
    expect(screen.getByText(/choose your ai model/i)).toBeInTheDocument();

    // Wait for models to load
    await waitFor(() => {
      expect(screen.queryByText(/loading models/i)).not.toBeInTheDocument();
    });
  });

  it("renders model selector with default model", async () => {
    render(<NewChatPage />);

    // Wait for models to load
    await waitFor(() => {
      expect(screen.getByText("AI Model")).toBeInTheDocument();
    });

    // Model picker should be rendered
    await waitFor(() => {
      expect(screen.queryByText(/loading models/i)).not.toBeInTheDocument();
    });
  });

  it("displays model pricing information", async () => {
    render(<NewChatPage />);

    // Wait for models to load
    await waitFor(() => {
      expect(screen.getByText(/input price/i)).toBeInTheDocument();
      expect(screen.getByText(/output price/i)).toBeInTheDocument();
    });
  });

  it("renders system prompt textarea", () => {
    render(<NewChatPage />);

    expect(screen.getByRole("textbox", { name: /system prompt/i })).toBeInTheDocument();
    expect(screen.getByText(/leave blank to use the default/i)).toBeInTheDocument();
  });

  it("renders start chat button", () => {
    render(<NewChatPage />);

    expect(screen.getByRole("button", { name: /start chat/i })).toBeInTheDocument();
  });

  it("creates conversation and redirects on success", async () => {
    mockCreateConversation.mockResolvedValue({ success: true, id: "new-conv-123" });

    render(<NewChatPage />);

    // Wait for models to load
    await waitFor(() => {
      expect(screen.queryByText(/loading models/i)).not.toBeInTheDocument();
    });

    const startButton = screen.getByRole("button", { name: /start chat/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockCreateConversation).toHaveBeenCalledWith({
        model: "openrouter/anthropic/claude-3",
        systemPrompt: undefined,
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/chat/new-conv-123");
    });
  });

  it("displays error message on failure", async () => {
    mockCreateConversation.mockResolvedValue({ success: false, error: "Server error" });

    render(<NewChatPage />);

    // Wait for models to load
    await waitFor(() => {
      expect(screen.queryByText(/loading models/i)).not.toBeInTheDocument();
    });

    const startButton = screen.getByRole("button", { name: /start chat/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("displays default error message when no error provided", async () => {
    mockCreateConversation.mockResolvedValue({ success: false });

    render(<NewChatPage />);

    // Wait for models to load
    await waitFor(() => {
      expect(screen.queryByText(/loading models/i)).not.toBeInTheDocument();
    });

    const startButton = screen.getByRole("button", { name: /start chat/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to create conversation")).toBeInTheDocument();
    });
  });

  it("passes system prompt when provided", async () => {
    mockCreateConversation.mockResolvedValue({ success: true, id: "conv-456" });
    const user = userEvent.setup();

    render(<NewChatPage />);

    // Wait for models to load
    await waitFor(() => {
      expect(screen.queryByText(/loading models/i)).not.toBeInTheDocument();
    });

    const systemPromptInput = screen.getByRole("textbox", { name: /system prompt/i });
    await user.type(systemPromptInput, "You are a helpful assistant");

    const startButton = screen.getByRole("button", { name: /start chat/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(mockCreateConversation).toHaveBeenCalledWith({
        model: "openrouter/anthropic/claude-3",
        systemPrompt: "You are a helpful assistant",
      });
    });
  });

  it("disables button and shows loading state during submission", async () => {
    let resolvePromise: (value: { success: boolean; id: string }) => void;
    mockCreateConversation.mockImplementation(() =>
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    render(<NewChatPage />);

    // Wait for models to load
    await waitFor(() => {
      expect(screen.queryByText(/loading models/i)).not.toBeInTheDocument();
    });

    const startButton = screen.getByRole("button", { name: /start chat/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
    });

    // Resolve the promise
    resolvePromise!({ success: true, id: "conv-789" });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
  });
});
