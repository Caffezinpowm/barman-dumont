const paths: Record<string, string> = {
  search:
    '<circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4.5 4.5"></path>',
  heart:
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"></path>',
  "heart-filled":
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" fill="currentColor" stroke="none"></path>',
  moon: '<path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z"></path>',
  sun:
    '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>',
  copy:
    '<rect x="8" y="8" width="12" height="12" rx="1.5"></rect><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"></path>',
  printer:
    '<path d="M7 8V3h10v5"></path><rect x="4" y="8" width="16" height="8" rx="1.5"></rect><path d="M7 13h10v8H7z"></path><path d="M17 11h.01"></path>',
  link:
    '<path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7l-1.3 1.3"></path><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 0 0 5.7 5.7l1.3-1.3"></path>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"></path>',
  "arrow-up-right": '<path d="M7 17 17 7M8 7h9v9"></path>',
  plus: '<path d="M12 5v14M5 12h14"></path>',
  check: '<path d="m5 12 4.5 4.5L19 7"></path>',
  x: '<path d="m6 6 12 12M18 6 6 18"></path>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"></path>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"></path>',
  chevron: '<path d="m6 9 6 6 6-6"></path>',
  book:
    '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"></path><path d="M4 18.5V5.5M8 7h8M8 11h6"></path>',
  glass:
    '<path d="M6 3h12l-1.5 8.5a4.7 4.7 0 0 1-9 0z"></path><path d="M12 16v5M8 21h8"></path>',
  bottle:
    '<path d="M10 3h4v4l2 3v9a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-9l2-3z"></path><path d="M8 12h8M10 3h4"></path>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"></path><circle cx="16" cy="7" r="2"></circle><circle cx="8" cy="17" r="2"></circle>',
  monitor: '<rect x="3" y="4" width="18" height="13" rx="1.5"></rect><path d="M8 21h8M12 17v4"></path>',
  clock: '<circle cx="12" cy="12" r="8.5"></circle><path d="M12 7v5l3 2"></path>',
  info: '<circle cx="12" cy="12" r="8.5"></circle><path d="M12 11v5M12 8h.01"></path>',
  alert:
    '<path d="M12 3 2.8 20h18.4z"></path><path d="M12 9v5M12 17h.01"></path>',
  github:
    '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.1-1.5 6.1-6.8a5.3 5.3 0 0 0-1.4-3.7 4.9 4.9 0 0 0-.1-3.7s-1.1-.3-3.8 1.4a13 13 0 0 0-6.8 0C6.4 1.9 5.3 2.2 5.3 2.2a4.9 4.9 0 0 0-.1 3.7A5.3 5.3 0 0 0 3.8 9.6c0 5.3 3.1 6.5 6.1 6.8a3.4 3.4 0 0 0-.9 2.6V22"></path>',
};

export function icon(name: keyof typeof paths | string, className = "icon"): string {
  const body = paths[name] ?? paths.info;
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

export function iconNode(name: string, className = "icon"): SVGElement {
  const template = document.createElement("template");
  template.innerHTML = icon(name, className);
  return template.content.firstElementChild as SVGElement;
}
