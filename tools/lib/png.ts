import { openSync, readSync, closeSync } from "node:fs";

export interface PngSize {
  width: number;
  height: number;
}

/** Lê largura e altura do cabeçalho IHDR sem dependências externas. */
export function readPngSize(path: string): PngSize {
  const fd = openSync(path, "r");
  try {
    const header = Buffer.alloc(24);
    const read = readSync(fd, header, 0, 24, 0);
    if (read < 24) throw new Error("PNG truncado");
    const signature = header.subarray(0, 8).toString("hex");
    if (signature !== "89504e470d0a1a0a") throw new Error("Arquivo não é PNG");
    return {
      width: header.readUInt32BE(16),
      height: header.readUInt32BE(20),
    };
  } finally {
    closeSync(fd);
  }
}
