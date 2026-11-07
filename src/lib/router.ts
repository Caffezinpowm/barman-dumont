export interface ParsedRoute {
  hash: string;
  path: string;
  segments: string[];
  query: URLSearchParams;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function parseHash(hash = window.location.hash): ParsedRoute {
  const raw = hash.replace(/^#/, "") || "/";
  const queryIndex = raw.indexOf("?");
  const pathPart = queryIndex >= 0 ? raw.slice(0, queryIndex) : raw;
  const queryPart = queryIndex >= 0 ? raw.slice(queryIndex + 1) : "";
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  return {
    hash: raw,
    path,
    segments: path.split("/").filter(Boolean).map(decodeSegment),
    query: new URLSearchParams(queryPart),
  };
}

export function navigate(path: string): void {
  const next = path.startsWith("#") ? path : `#${path.startsWith("/") ? path : `/${path}`}`;
  if (window.location.hash === next) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = next;
  }
}

export function routeHref(path: string): string {
  return `#${path.startsWith("/") ? path : `/${path}`}`;
}
