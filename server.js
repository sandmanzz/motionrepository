/*
 * Dev server statis tanpa dependency, dengan dukungan HTTP Range.
 * Range wajib untuk video yang di-scrub (python -m http.server tidak mendukungnya,
 * sehingga video.currentTime selalu kembali ke 0).
 *
 *   node server.js [port]
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.argv[2]) || 4173;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".md": "text/markdown; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".mp4": "video/mp4", ".webm": "video/webm", ".woff2": "font/woff2", ".ico": "image/x-icon"
};

http.createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(req.url.split("?")[0]); } catch (e) { res.writeHead(400); return res.end(); }
  let file = path.normalize(path.join(ROOT, rel));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }

  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) {
      file = path.join(file, "index.html");
      try { st = fs.statSync(file); } catch (e) { err = e; }
    }
    if (err || !st.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("404");
    }
    const head = {
      "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache"
    };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (m && (m[1] || m[2])) {
      let start = m[1] ? Number(m[1]) : st.size - Number(m[2]);
      let end = m[1] && m[2] ? Number(m[2]) : st.size - 1;
      start = Math.max(0, start);
      end = Math.min(end, st.size - 1);
      if (start > end) {
        res.writeHead(416, { "Content-Range": `bytes */${st.size}` });
        return res.end();
      }
      head["Content-Range"] = `bytes ${start}-${end}/${st.size}`;
      head["Content-Length"] = end - start + 1;
      res.writeHead(206, head);
      return req.method === "HEAD" ? res.end() : fs.createReadStream(file, { start, end }).pipe(res);
    }
    head["Content-Length"] = st.size;
    res.writeHead(200, head);
    return req.method === "HEAD" ? res.end() : fs.createReadStream(file).pipe(res);
  });
}).listen(PORT, () => console.log(`Stock Motion → http://localhost:${PORT}`));
