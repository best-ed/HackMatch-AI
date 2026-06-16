import { afterEach, describe, expect, it, vi } from "vitest";
import { clipboardStatusMessage, copyTextToClipboard } from "@/lib/clipboard";

describe("clipboard utility", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the clipboard api when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });

    const result = await copyTextToClipboard("hm-FDPLQ7");

    expect(writeText).toHaveBeenCalledWith("hm-FDPLQ7");
    expect(result).toEqual({
      ok: true,
      method: "clipboard",
      message: "Copied to clipboard."
    });
  });

  it("falls back when the clipboard api is blocked", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("blocked"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });
    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand
    });

    const result = await copyTextToClipboard("team summary");

    expect(writeText).toHaveBeenCalledWith("team summary");
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(result.method).toBe("fallback");
    expect(result.ok).toBe(true);
  });

  it("returns an actionable unsupported result", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => false)
    });

    const result = await copyTextToClipboard("copy me");

    expect(result).toEqual({
      ok: false,
      method: "unsupported",
      message: "Clipboard copy is not available in this browser."
    });
  });

  it("formats fallback status messages", () => {
    expect(clipboardStatusMessage({
      ok: true,
      method: "fallback",
      message: "Copied with browser fallback."
    }, "Copied access link.")).toBe("Copied access link. Browser fallback used.");
  });
});
