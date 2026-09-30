import type { Song } from "./data";

export type MusicGrouping = "all" | "album" | "artist";
const compareText = (a: string, b: string) => a.localeCompare(b, "zh-CN", { numeric: true });

export function musicGroups(songs: Song[], grouping: MusicGrouping) {
  const groups = new Map<string, number[]>();
  songs.forEach((song, index) => {
    const name = grouping === "album" ? song.album : grouping === "artist" ? song.artist : "全部歌曲";
    const entries = groups.get(name) ?? [];
    entries.push(index);
    groups.set(name, entries);
  });
  return [...groups].sort(([a], [b]) => compareText(a, b)).map(([name, indices]) => ({
    name,
    indices: indices.sort((a, b) => {
      const x = songs[a], y = songs[b];
      return (grouping === "artist" ? compareText(x.album, y.album) : 0)
        || (grouping !== "all" ? (x.track ?? Infinity) - (y.track ?? Infinity) : 0)
        || compareText(x.title, y.title) || a - b;
    }),
  }));
}

export function durationLabel(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "未记录";
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}
