import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function moduleFrom(name) {
  const source = await readFile(new URL(`../src/${name}.ts`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}
const { DecryptionController } = await moduleFrom("decryption");
const { RenderCadence } = await moduleFrom("render-cadence");
const finish = controller => { for (let i = 0; i < 150; i++) controller.update(1 / 30, true, false); };

test("changing tracks in detail restarts decryption and clears again", () => {
  const controller = new DecryptionController();
  controller.enter();
  finish(controller);
  assert.equal(controller.frame.phase, "clear");
  for (let i = 0; i < 3; i++) {
    controller.select();
    assert.equal(controller.clarity, 0);
    finish(controller);
    assert.equal(controller.frame.phase, "clear");
  }
});
test("rapid selection waits for model readiness, preserves restored clarity and stays closed in gallery", () => {
  const controller = new DecryptionController();
  controller.enter();
  controller.update(0.05, true, false);
  controller.select();
  controller.select();
  controller.update(0.05, false, false);
  assert.equal(controller.frame.time, -1);
  finish(controller);
  assert.equal(controller.frame.phase, "clear");
  controller.select(1);
  assert.equal(controller.frame.phase, "clear");
  controller.leave();
  controller.select();
  finish(controller);
  assert.equal(controller.frame.time, -1);
});
test("GPU cadence stays at 30 submissions per second across display refresh rates", () => {
  for (const refresh of [60, 75, 120, 144, 240]) {
    const cadence = new RenderCadence();
    let submissions = 0;
    for (let i = 0; i < refresh * 10; i++) if (cadence.due(i / refresh)) submissions++;
    assert.equal(submissions, 300, `Display ${refresh}Hz`);
    assert.equal(cadence.due(60), true);
    assert.equal(cadence.due(60 + 1 / 240), false);
  }
});
test("opening animation retains display cadence", () => {
  const cadence = new RenderCadence();
  for (let i = 0; i < 120; i++) assert.equal(cadence.due(i / 120, true), true);
});
