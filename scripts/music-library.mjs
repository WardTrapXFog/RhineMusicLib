import { createReadStream, existsSync, readFileSync } from "node:fs";
import { readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseFile } from "music-metadata";

const execFileAsync = promisify(execFile);
const extensions = new Set([".mp3", ".flac", ".m4a", ".aac", ".ogg", ".wav", ".opus"]);
const configPath = path.resolve(".rhine-music-config.json");
let savedDirectory = "";
try { savedDirectory = JSON.parse(readFileSync(configPath, "utf8")).directory || ""; } catch { /* First run. */ }
let directory = savedDirectory;
let songs = [];
let covers = new Map();

export async function filesUnder(root) {
  const found = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase()))
      found.push(path.join(root, entry.name));
  }
  return found.sort((a, b) => a.localeCompare(b, "zh-Hans-CN", { numeric: true }));
}

async function scan(root) {
  const absolute = path.resolve(root);
  if (!existsSync(absolute) || !(await stat(absolute)).isDirectory()) throw new Error("音乐目录不存在或无法读取");
  const files = await filesUnder(absolute);
  const nextCovers = new Map();
  const nextSongs = await Promise.all(files.map(async (file, index) => {
    let metadata;
    try { metadata = await parseFile(file, { duration: true, skipCovers: false }); } catch { /* A playable file can lack readable tags. */ }
    const picture = metadata?.common.picture?.[0];
    if (picture) nextCovers.set(index, { data: picture.data, mime: picture.format });
    const stem = path.basename(file, path.extname(file));
    return {
      id: index,
      title: metadata?.common.title?.trim() || stem,
      artist: metadata?.common.artist?.trim() || "未知艺术家",
      album: metadata?.common.album?.trim() || "未分类专辑",
      year: metadata?.common.year || null,
      track: metadata?.common.track?.no || null,
      duration: Number.isFinite(metadata?.format.duration) ? metadata.format.duration : null,
      hasCover: Boolean(picture),
      file,
    };
  }));
  directory = absolute;
  songs = nextSongs;
  covers = nextCovers;
  return publicCatalog();
}

async function pickDirectory() {
  if (process.platform !== "win32") throw new Error("请在输入框中填写音乐文件夹路径");
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$owner = New-Object System.Windows.Forms.Form",
    "$owner.TopMost = $true",
    "$owner.ShowInTaskbar = $false",
    "$owner.Opacity = 0",
    "$owner.Show()",
    "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
    "$dialog.Description = '选择本地音乐文件夹'",
    "try { if ($dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Write($dialog.SelectedPath) } } finally { $dialog.Dispose(); $owner.Dispose() }",
  ].join("; ");
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-STA", "-Command", script], { timeout: 120000 });
  return stdout.trim();
}

function publicCatalog() {
  return { directory, songs: songs.map(({ file, ...song }) => song) };
}

function sendJson(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(value));
}

async function bodyJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
    if (Buffer.concat(chunks).length > 8192) throw new Error("请求内容过长");
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function musicLibraryPlugin() {
  let scanning;
  const rescan = root => scanning = scan(root).finally(() => { scanning = undefined; });
  const handler = async (req, res, next) => {
    const url = new URL(req.url || "/", "http://localhost");
    if (!url.pathname.startsWith("/api/music/")) return next();
    try {
      const host = String(req.headers.host || "").split(":")[0].toLowerCase();
      if (host !== "127.0.0.1" && host !== "localhost") return sendJson(res, 403, { error: "仅允许本机访问" });
      if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return sendJson(res, 403, { error: "来源不受信任" });
      if (req.headers["sec-fetch-site"] === "cross-site") return sendJson(res, 403, { error: "来源不受信任" });
      if (url.pathname === "/api/music/library" && req.method === "GET") {
        if (scanning) await scanning;
        if (directory && !songs.length) await rescan(directory);
        return sendJson(res, 200, publicCatalog());
      }
      if (url.pathname === "/api/music/library" && req.method === "POST") {
        const body = await bodyJson(req);
        if (typeof body.directory !== "string" || !body.directory.trim()) return sendJson(res, 400, { error: "请输入音乐目录" });
        const catalog = await rescan(body.directory.trim());
        await writeFile(configPath, JSON.stringify({ directory }, null, 2), "utf8");
        return sendJson(res, 200, catalog);
      }
      if (url.pathname === "/api/music/pick" && req.method === "POST") {
        return sendJson(res, 200, { directory: await pickDirectory() });
      }
      const match = /^\/api\/music\/(audio|cover)\/(\d+)$/.exec(url.pathname);
      if (!match || req.method !== "GET") return sendJson(res, 404, { error: "未找到音频资源" });
      if (scanning) await scanning;
      if (directory && !songs.length) await rescan(directory);
      const song = songs[Number(match[2])];
      if (!song) return sendJson(res, 404, { error: "歌曲不存在" });
      if (match[1] === "cover") {
        const cover = covers.get(song.id);
        if (!cover) return sendJson(res, 404, { error: "没有内嵌封面" });
        res.writeHead(200, { "Content-Type": cover.mime, "Content-Length": cover.data.length, "Cache-Control": "private, max-age=3600" });
        return res.end(cover.data);
      }
      const info = await stat(song.file);
      const range = req.headers.range;
      const mime = { ".mp3": "audio/mpeg", ".flac": "audio/flac", ".m4a": "audio/mp4", ".aac": "audio/aac", ".ogg": "audio/ogg", ".wav": "audio/wav", ".opus": "audio/ogg" }[path.extname(song.file).toLowerCase()] || "application/octet-stream";
      let start = 0, end = info.size - 1;
      if (range) {
        const parsed = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!parsed) { res.writeHead(416, { "Content-Range": `bytes */${info.size}` }); return res.end(); }
        if (parsed[1]) start = Number(parsed[1]);
        if (parsed[2]) end = Number(parsed[2]);
        if (!parsed[1] && parsed[2]) start = Math.max(0, info.size - Number(parsed[2]));
        end = Math.min(end, info.size - 1);
        if (start > end || start >= info.size) { res.writeHead(416, { "Content-Range": `bytes */${info.size}` }); return res.end(); }
      }
      res.writeHead(range ? 206 : 200, {
        "Content-Type": mime,
        "Content-Length": end - start + 1,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
        ...(range ? { "Content-Range": `bytes ${start}-${end}/${info.size}` } : {}),
      });
      return createReadStream(song.file, { start, end }).pipe(res);
    } catch (error) {
      return sendJson(res, 400, { error: error instanceof Error ? error.message : "音乐目录读取失败" });
    }
  };
  return { name: "local-music-library", configureServer(server) { server.middlewares.use(handler); }, configurePreviewServer(server) { server.middlewares.use(handler); } };
}
