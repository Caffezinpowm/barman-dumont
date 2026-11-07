export type Child = Node | string | number | null | undefined | false;

type Props = Record<string, unknown> & {
  class?: string;
  text?: string;
  html?: string;
  style?: Record<string, string>;
  dataset?: Record<string, string>;
};

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") {
      node.className = String(value);
    } else if (key === "text") {
      node.textContent = String(value);
    } else if (key === "html") {
      node.innerHTML = String(value);
    } else if (key === "style" && typeof value === "object") {
      for (const [prop, propValue] of Object.entries(value as Record<string, string>)) {
        if (prop.startsWith("--")) node.style.setProperty(prop, propValue);
        else Object.assign(node.style, { [prop]: propValue });
      }
    } else if (key === "dataset" && typeof value === "object") {
      Object.assign(node.dataset, value);
    } else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (value === true) {
      node.setAttribute(key, "");
    } else {
      node.setAttribute(key, String(value));
    }
  }
  appendChildren(node, children);
  return node;
}

export function appendChildren(node: Node, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(typeof child === "string" || typeof child === "number"
      ? document.createTextNode(String(child))
      : child);
  }
}

export function frag(...children: Child[]): DocumentFragment {
  const fragment = document.createDocumentFragment();
  appendChildren(fragment, children);
  return fragment;
}

export function fill(node: HTMLElement, ...children: Child[]): HTMLElement {
  node.replaceChildren();
  appendChildren(node, children);
  return node;
}

export function debounce(fn: () => void, delay: number): () => void {
  let timer: number | undefined;
  return () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(fn, delay);
  };
}

export function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: "auto" });
}

export function isFormField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable ||
    target.closest("[contenteditable='true']") !== null
  );
}
