import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/music-catalog.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { musicGroups, durationLabel } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
const song = (album, artist, track, title) => ({ album, artist, track, title });

test("album order follows track numbers and keeps every song once", () => {
  const library = [song("Album 2", "A", 9, "Final"), song("Album 2", "B", 1, "Opening"), song("Album 10", "A", null, "Untitled"), song("Album 2", "A", null, "Extra")];
  const groups = musicGroups(library, "album");
  assert.deepEqual(groups.map(group => group.name), ["Album 2", "Album 10"]);
  assert.deepEqual(groups[0].indices, [1, 0, 3]);
  assert.deepEqual(groups.flatMap(group => group.indices).sort((a, b) => a - b), [0, 1, 2, 3]);
});

test("artist collections retain album order, while all collects the complete library", () => {
  const library = [song("Album 10", "A", 1, "Z"), song("Album 2", "A", 2, "B"), song("Album 2", "A", 1, "A"), song("Album 2", "B", 1, "C")];
  assert.deepEqual(musicGroups(library, "artist")[0].indices, [2, 1, 0]);
  assert.deepEqual(musicGroups(library, "all")[0].indices, [2, 1, 3, 0]);
  assert.deepEqual(musicGroups([], "album"), []);
});

test("more than five collections and long albums remain complete", () => {
  const library = Array.from({ length: 70 }, (_, index) => song(`Album ${index}`, `Artist ${index % 7}`, 1, `Song ${index}`));
  library.push(...Array.from({ length: 45 }, (_, index) => song("Album 0", "Artist 0", index + 2, `Long ${index}`)));
  const groups = musicGroups(library, "album");
  assert.equal(groups.length, 70);
  assert.equal(groups[0].indices.length, 46);
  assert.equal(new Set(groups.flatMap(group => group.indices)).size, library.length);
});

test("duration labels distinguish missing and zero duration", () => {
  assert.equal(durationLabel(null), "未记录");
  assert.equal(durationLabel(NaN), "未记录");
  assert.equal(durationLabel(0), "00:00");
  assert.equal(durationLabel(367), "06:07");
});
