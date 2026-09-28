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

export const archiveColumns = ["声音档案 01", "声音档案 02", "声音档案 03", "声音档案 04", "声音档案 05"];
export const categories = ["全部歌曲", ...archiveColumns];
export let musicDirectory = "";
export let musicError = "";
export let songs: Song[] = [];

function mapRecords(library: Song[]): ArchiveRecord[] {
  return library.map((song, index) => ({
    id: `M-${String(index + 1).padStart(3, "0")}`,
    title: song.title,
    en: song.title,
    department: song.artist,
    category: archiveColumns[index % archiveColumns.length],
    date: song.album,
    lead: song.year ? String(song.year) : "—",
    clearance: "READY TO PLAY",
    abstract: `${song.artist} · ${song.album}`,
    findings: [],
    source: "",
    song,
  }));
}

export let records: ArchiveRecord[] = [];
let columnIndex: number[][] = [];
function indexRecords() {
  columnIndex = archiveColumns.map(() => []);
  records.forEach((record, index) => columnIndex[archiveColumns.indexOf(record.category)]?.push(index));
}
export async function loadMusicLibrary(directory?: string) {
  const response = await fetch("/api/music/library", {
    method: directory ? "POST" : "GET",
    headers: directory ? { "Content-Type": "application/json" } : undefined,
    body: directory ? JSON.stringify({ directory }) : undefined,
  });
  const result = await response.json() as { directory?: string; songs?: Song[]; error?: string };
  if (!response.ok) throw new Error(result.error || "曲库读取失败");
  musicDirectory = result.directory || musicDirectory;
  songs = result.songs || [];
  archiveColumns.length = Math.min(5, songs.length);
  categories.splice(1, categories.length - 1, ...archiveColumns);
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
  return { lane, row, slot: row < 32 ? lane * 32 + row : 1000 + index };
}

export function fileAtSlot(slot: number) {
  if (slot >= 1000) return slot - 1000;
  const files = columnFiles(Math.floor(slot / 32));
  return files[Math.max(0, Math.min(files.length - 1, (slot % 32) - 12))];
}
