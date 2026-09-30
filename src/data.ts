import { browserAudioUrl, browserCoverUrl, forgetBrowserDirectory, readBrowserDirectory } from "./browser-library";
import { musicGroups, durationLabel, type MusicGrouping } from "./music-catalog";

export interface Song {
  id: number;
  title: string;
  artist: string;
  album: string;
  year: number | null;
  track: number | null;
  duration: number | null;
  hasCover: boolean;
}

export interface ArchiveRecord {
  id: string;
  title: string;
  en: string;
  department: string;
  category: string;
  date: string;
  lead: string;
  clearance: string;
  abstract: string;
  findings: string[];
  source: string;
  song: Song | null;
}

export const archiveColumns: string[] = [];
export const categories = ["全部歌曲", ...archiveColumns];
export let musicGrouping: MusicGrouping = "album";
try {
  const stored = localStorage.getItem("rhine-music-grouping");
  if (stored === "all" || stored === "artist") musicGrouping = stored;
} catch {}
export let musicDirectory = "";
export let musicError = "";
export let songs: Song[] = [];
export let browserLibraryActive = false;

export const songAudioUrl = (id: number) => browserAudioUrl(id) || `/api/music/audio/${id}`;
export const songCoverUrl = (id: number) => browserCoverUrl(id) || `/api/music/cover/${id}`;

function mapRecords(library: Song[]): ArchiveRecord[] {
  return library.map((song, index) => ({
    id: `M-${String(index + 1).padStart(3, "0")}`,
    title: song.title,
    en: song.title,
    department: song.artist,
    category: "",
    date: song.album,
    lead: song.year ? String(song.year) : "—",
    clearance: "READY TO PLAY",
    abstract: `《${song.title}》收录于《${song.album}》，演出者为 ${song.artist}。${song.year ? `年份标记为 ${song.year} 年。` : "音源未记录年份。"}${song.track ? `专辑内曲序为第 ${song.track} 轨。` : "音源未记录曲序。"}`,
    findings: [
      `音轨时长：${durationLabel(song.duration)}。`,
      song.hasCover ? "载体包含内嵌封面，唱片盘面沿用原始图像。" : "载体未包含内嵌封面，使用莱茵音乐库标准盘面。",
      "声音与封面在当前终端读取。档案信息来自音源标签，未记录的项目保留为空。",
    ],
    source: "AUDIO METADATA / 音源标签",
    song,
  }));
}

export let records: ArchiveRecord[] = [];
let columnIndex: number[][] = [];
function indexRecords() {
  const groups = musicGroups(songs, musicGrouping);
  archiveColumns.splice(0, archiveColumns.length, ...groups.map(group => group.name));
  categories.splice(1, categories.length - 1, ...archiveColumns.filter(name => name !== "全部歌曲"));
  columnIndex = groups.map(group => group.indices);
  groups.forEach(group => group.indices.forEach(index => { if (records[index]) records[index].category = group.name; }));
}
export function setMusicGrouping(grouping: MusicGrouping) {
  musicGrouping = grouping;
  try { localStorage.setItem("rhine-music-grouping", grouping); } catch {}
  indexRecords();
}
export function playbackOrder() { return columnIndex.flat(); }
export async function loadMusicLibrary(directory?: string) {
  if (!directory) {
    try {
      const browserCatalog = await readBrowserDirectory();
      if (browserCatalog) {
        browserLibraryActive = true;
        musicDirectory = browserCatalog.directory;
        songs = browserCatalog.songs;
        records = mapRecords(songs);
        indexRecords();
        return records;
      }
    } catch { await forgetBrowserDirectory().catch(() => {}); }
  }
  const response = await fetch("/api/music/library", {
    method: directory ? "POST" : "GET",
    headers: directory ? { "Content-Type": "application/json" } : undefined,
    body: directory ? JSON.stringify({ directory }) : undefined,
  });
  const body = await response.text();
  let result: { directory?: string; songs?: Song[]; error?: string };
  try { result = JSON.parse(body); }
  catch { throw new Error("本机音乐服务未响应。请双击启动音乐播放器.bat，或点击“浏览”授权浏览器读取文件夹。"); }
  if (!response.ok) throw new Error(result.error || "曲库读取失败");
  if (directory) await forgetBrowserDirectory().catch(() => {});
  browserLibraryActive = false;
  musicDirectory = result.directory || musicDirectory;
  songs = result.songs || [];
  records = mapRecords(songs);
  indexRecords();
  return records;
}

try { await loadMusicLibrary(); }
catch (error) {
  musicError = error instanceof Error ? error.message : "曲库读取失败";
  records = [];
  indexRecords();
}

export function columnFiles(lane: number) {
  return columnIndex[lane] || [];
}

export function fileLocation(index: number) {
  const lane = archiveColumns.indexOf(records[index].category);
  const row = 12 + columnFiles(lane).indexOf(index);
  return { lane, row, slot: 1000 + index };
}

export function fileAtSlot(slot: number) {
  if (slot >= 1000) return slot - 1000;
  const files = columnFiles(Math.floor(slot / 32));
  return files[Math.max(0, Math.min(files.length - 1, (slot % 32) - 12))];
}
