export type ClipboardCopyMethod = "clipboard" | "fallback" | "unsupported";

export type ClipboardCopyResult = {
  ok: boolean;
  method: ClipboardCopyMethod;
  message: string;
};

export async function copyTextToClipboard(text: string): Promise<ClipboardCopyResult> {
  if (!text) {
    return {
      ok: false,
      method: "unsupported",
      message: "Nothing was available to copy."
    };
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return {
        ok: true,
        method: "clipboard",
        message: "Copied to clipboard."
      };
    } catch {
      // Fall through to the textarea fallback when browser permissions block the Clipboard API.
    }
  }

  if (typeof document !== "undefined" && typeof document.execCommand === "function") {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.left = "-1000px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      if (document.execCommand("copy")) {
        return {
          ok: true,
          method: "fallback",
          message: "Copied with browser fallback."
        };
      }
    } finally {
      textarea.remove();
    }
  }

  return {
    ok: false,
    method: "unsupported",
    message: "Clipboard copy is not available in this browser."
  };
}

export function clipboardStatusMessage(result: ClipboardCopyResult, successMessage: string) {
  if (!result.ok) return result.message;
  if (result.method === "fallback") return `${successMessage} Browser fallback used.`;
  return successMessage;
}
