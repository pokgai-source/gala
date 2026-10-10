// Tiny static server for previewing _site/ at http://localhost:8080/
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "_site");
const port = Number(process.env.PORT) || 8080;
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".md": "text/plain; charset=utf-8" };

createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([/\\])+/, "");
  let file = join(dir, p);
  if (!file.startsWith(dir)) return res.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(port, () => console.log(`Serving _site/ at http://localhost:${port}/`));
