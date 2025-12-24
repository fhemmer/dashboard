import { beforeEach, describe, expect, it, vi } from "vitest";

// Store mock function reference
const mockGetServerEnv = vi.fn();

// Mock the env module
vi.mock("./env", () => ({
  getServerEnv: () => mockGetServerEnv(),
}));

// Mock Resend
const mockSend = vi.fn();
vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = {
      send: mockSend,
    };
  },
}));

// Dynamic import to reset module state
async function importResend() {
  vi.resetModules();
  return await import("./resend");
}

describe("resend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerEnv.mockReturnValue({ RESEND_API_KEY: "re_test_key" });
  });

  describe("getResend", () => {
    it("creates a Resend instance with API key", async () => {
      const { getResend } = await importResend();
      const resend = getResend();
      expect(resend).toBeDefined();
      expect(resend.emails).toBeDefined();
    });

    it("throws error when API key is not configured", async () => {
      mockGetServerEnv.mockReturnValue({ RESEND_API_KEY: undefined });
      const { getResend } = await importResend();
      expect(() => getResend()).toThrow("RESEND_API_KEY is not configured");
    });
  });

  describe("sendEmail", () => {
    it("sends email with required options", async () => {
      const { sendEmail } = await importResend();
      mockSend.mockResolvedValue({ data: { id: "email-123" }, error: null });

      const result = await sendEmail({
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
      });

      expect(mockSend).toHaveBeenCalledWith({
        from: "Dashboard <noreply@updates.hemmer.us>",
        to: ["test@example.com"],
        subject: "Test Subject",
        html: "<p>Test content</p>",
      });
      expect(result).toEqual({ id: "email-123" });
    });

    it("sends email with custom from address", async () => {
      const { sendEmail } = await importResend();
      mockSend.mockResolvedValue({ data: { id: "email-456" }, error: null });

      await sendEmail({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Content</p>",
        from: "Custom <custom@hemsoft.com>",
      });

      expect(mockSend).toHaveBeenCalledWith({
        from: "Custom <custom@hemsoft.com>",
        to: ["test@example.com"],
        subject: "Test",
        html: "<p>Content</p>",
      });
    });

    it("sends email to multiple recipients", async () => {
      const { sendEmail } = await importResend();
      mockSend.mockResolvedValue({ data: { id: "email-789" }, error: null });

      await sendEmail({
        to: ["user1@example.com", "user2@example.com"],
        subject: "Bulk Test",
        html: "<p>Bulk content</p>",
      });

      expect(mockSend).toHaveBeenCalledWith({
        from: "Dashboard <noreply@updates.hemmer.us>",
        to: ["user1@example.com", "user2@example.com"],
        subject: "Bulk Test",
        html: "<p>Bulk content</p>",
      });
    });

    it("throws error when send fails", async () => {
      const { sendEmail } = await importResend();
      mockSend.mockResolvedValue({ data: null, error: { message: "Invalid API key" } });

      await expect(
        sendEmail({
          to: "test@example.com",
          subject: "Test",
          html: "<p>Content</p>",
        })
      ).rejects.toThrow("Invalid API key");
    });
  });
});
