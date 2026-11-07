import { h } from "./dom";
import { icon } from "./icons";

let container: HTMLElement | null = null;

function getContainer(): HTMLElement {
  if (container) return container;
  container = h("div", {
    class: "toast-stack",
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "false",
  });
  document.body.appendChild(container);
  return container;
}

export function showToast(message: string, tone: "ok" | "error" = "ok"): void {
  const node = h(
    "div",
    { class: `toast-item toast-item--${tone}` },
    h("span", { class: "toast-icon", html: icon(tone === "ok" ? "check" : "alert") }),
    h("span", { text: message }),
  );
  getContainer().appendChild(node);
  window.setTimeout(() => {
    node.classList.add("toast-item--out");
    window.setTimeout(() => node.remove(), 260);
  }, 3200);
}

function legacyCopy(text: string): boolean {
  const textarea = h("textarea", {
    "aria-hidden": "true",
    tabindex: "-1",
    style: {
      position: "fixed",
      left: "-9999px",
      top: "0",
    },
  });
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  textarea.remove();
  return copied;
}

export async function copyText(text: string, successMessage: string): Promise<void> {
  let copied = false;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      // Permissão negada ou contexto sem foco: tenta o caminho antigo abaixo.
    }
  }
  if (!copied) copied = legacyCopy(text);
  if (copied) showToast(successMessage);
  else showToast("Não foi possível copiar. Selecione o texto manualmente.", "error");
}
