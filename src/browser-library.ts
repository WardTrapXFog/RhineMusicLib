import { parseBlob } from "music-metadata";
import type { Song } from "./data";

type Directory = FileSystemDirectoryHandle & { values(): AsyncIterable<FileSystemHandle> };
type PickerWindow = Window & { showDirectoryPicker?: () => Promise<Directory> };
type Catalog = { directory: string; songs: Song[] };

const extensions = new Set([".mp3", ".flac", ".m4a", ".aac", ".ogg", ".wav", ".opus"]);
const files = new Map<number, File>();
const covers = new Map<number, Blob>();
const audioUrls = new Map<number, string>();
const coverUrls = new Map<number, string>();

export const canPickBrowserDirectory = typeof (window as PickerWindow).showDirectoryPicker === "function";

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("rhine-music-lib", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("settings");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storedDirectory(): Promise<Directory | null> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("settings", "readonly").objectStore("settings").get("directory");
      request.onsuccess = () => resolve((request.result as Directory | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

async function setStoredDirectory(handle: Directory | null): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("settings", "readwrite");
      const store = transaction.objectStore("settings");
      if (handle) store.put(handle, "directory");
      else store.delete("directory");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
}

export async function scanDirectory(directory: Directory): Promise<Catalog> {
  const found: { name: string; handle: FileSystemFileHandle }[] = [];
  for await (const entry of directory.values()) {
    if (entry.kind === "file" && extensions.has(entry.name.slice(entry.name.lastIndexOf(".")).toLowerCase()))
      found.push({ name: entry.name, handle: entry as FileSystemFileHandle });
  }
  found.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN", { numeric: true }));
  const nextFiles = new Map<number, File>();
  const nextCovers = new Map<number, Blob>();
  const songs = new Array<Song>(found.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, found.length) }, async () => {
    while (next < found.length) {
      const index = next++;
      const { name, handle } = found[index];
      const file = await handle.getFile();
      nextFiles.set(index, file);
      let metadata;
      try { metadata = await parseBlob(file, { duration: false }); }
      catch { /* Audio without readable tags remains playable. */ }
      const picture = metadata?.common.picture?.[0];
      if (picture) nextCovers.set(index, new Blob([new Uint8Array(picture.data)], { type: picture.format }));
      const stem = name.slice(name.lastIndexOf("/") + 1).replace(/\.[^.]+$/, "");
      songs[index] = {
        id: index,
        title: metadata?.common.title?.trim() || stem,
        artist: metadata?.common.artist?.trim() || "未知艺术家",
        album: metadata?.common.album?.trim() || "未分类专辑",
        year: metadata?.common.year || null,
        track: metadata?.common.track?.no || null,
        duration: Number.isFinite(metadata?.format.duration) ? metadata!.format.duration! : null,
        hasCover: Boolean(picture),
      };
    }
  }));
  for (const url of audioUrls.values()) URL.revokeObjectURL(url);
  for (const url of coverUrls.values()) URL.revokeObjectURL(url);
  audioUrls.clear(); coverUrls.clear();
  files.clear(); covers.clear();
  for (const [id, file] of nextFiles) files.set(id, file);
  for (const [id, cover] of nextCovers) covers.set(id, cover);
  return { directory: directory.name, songs };
}

export async function pickBrowserDirectory(): Promise<Directory> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) throw new Error("当前浏览器不支持选择文件夹，请使用 Chrome 或 Edge，或通过本机服务输入路径。");
  return picker.call(window);
}

export async function useBrowserDirectory(handle: Directory): Promise<Catalog> {
  const catalog = await scanDirectory(handle);
  await setStoredDirectory(handle);
  return catalog;
}

export async function readBrowserDirectory(): Promise<Catalog | null> {
  const handle = await storedDirectory();
  return handle ? scanDirectory(handle) : null;
}

export function forgetBrowserDirectory(): Promise<void> { return setStoredDirectory(null); }

export function browserAudioUrl(id: number): string | null {
  const file = files.get(id);
  if (!file) return null;
  let url = audioUrls.get(id);
  if (!url) { url = URL.createObjectURL(file); audioUrls.set(id, url); }
  return url;
}

export function browserCoverUrl(id: number): string | null {
  const cover = covers.get(id);
  if (!cover) return null;
  let url = coverUrls.get(id);
  if (!url) { url = URL.createObjectURL(cover); coverUrls.set(id, url); }
  return url;
}
