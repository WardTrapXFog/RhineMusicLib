import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";
import { filesUnder } from "../scripts/music-library.mjs";

test("local scanning only includes audio files directly inside the selected folder", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "rhine-directory-"));
  try {
    await mkdir(path.join(root, "nested"));
    for (const name of ["Track 10.MP3", "Track 2.flac", "notes.txt", "nested/hidden.mp3"])
      await writeFile(path.join(root, name), "");
    assert.deepEqual((await filesUnder(root)).map(file => path.basename(file)), ["Track 2.flac", "Track 10.MP3"]);
    assert.deepEqual(await filesUnder(path.join(root, "nested")), [path.join(root, "nested", "hidden.mp3")]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("browser scanning never opens subdirectories and supports an empty root", async () => {
  const source = (await readFile(new URL("../src/browser-library.ts", import.meta.url), "utf8"))
    .replace('from "music-metadata"', `from ${JSON.stringify(import.meta.resolve("music-metadata"))}`);
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const previous = globalThis.window;
  globalThis.window = {};
  try {
    const { scanDirectory } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    const folder = { name: "Collection", kind: "directory", async *values() {
      yield { name: "nested", kind: "directory", values() { throw new Error("Subfolder was accessed"); } };
      yield { name: "notes.txt", kind: "file", getFile() { throw new Error("Non-audio was opened"); } };
      yield { name: "Track 2.MP3", kind: "file", async getFile() { return new File([""], "Track 2.MP3"); } };
    } };
    const catalog = await scanDirectory(folder);
    assert.equal(catalog.songs.length, 1);
    assert.equal(catalog.songs[0].title, "Track 2");
    assert.deepEqual((await scanDirectory({ name: "Empty", async *values() {} })).songs, []);
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});
