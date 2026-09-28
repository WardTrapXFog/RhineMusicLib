import { loadMusicLibrary } from "./data";
import { canPickBrowserDirectory, pickBrowserDirectory, useBrowserDirectory } from "./browser-library";
import "./library-setup.css";

export function chooseMusicDirectory(): Promise<void> {
  return new Promise(resolve => {
    const panel = document.createElement("div");
    panel.className = "library-setup";
    panel.innerHTML = `<section class="library-setup-panel" role="dialog" aria-modal="true" aria-labelledby="library-setup-title">
      <div class="library-setup-code">RHINE MUSIC LIB <span>／</span> INITIALIZE AUDIO COLLECTION</div>
      <div class="library-setup-rule"></div>
      <h1 id="library-setup-title">选择音乐目录</h1>
      <p>选择本机音乐文件夹，曲库将自动读取歌曲信息和内嵌封面。也可以跳过，稍后从展厅载入。</p>
      <form><label for="library-directory">MUSIC DIRECTORY / 本机文件夹</label><div class="library-setup-field"><input id="library-directory" name="directory" autocomplete="off" spellcheck="false" placeholder="浏览选择文件夹，或在本机服务中输入路径"/><button type="button" data-browse>浏览…</button></div><div class="library-setup-error" role="status"></div><div class="library-setup-actions"><button type="button" data-skip>跳过，进入空白展厅</button><button type="submit" data-load>载入曲库 ↗</button></div></form>
      <div class="library-setup-foot">LOCAL AUDIO ACCESS <span>●</span> 文件仅在此设备读取</div>
    </section>`;
    document.body.appendChild(panel);
    const input = panel.querySelector<HTMLInputElement>("input")!;
    const error = panel.querySelector<HTMLElement>(".library-setup-error")!;
    const load = panel.querySelector<HTMLButtonElement>("[data-load]")!;
    const browse = panel.querySelector<HTMLButtonElement>("[data-browse]")!;
    const localServer = location.hostname === "127.0.0.1" || location.hostname === "localhost";
    let chosenDirectory: Awaited<ReturnType<typeof pickBrowserDirectory>> | null = null;
    if (!localServer) {
      input.readOnly = true;
      input.placeholder = canPickBrowserDirectory ? "点击浏览，授权浏览器读取文件夹" : "此浏览器不支持选择本机文件夹";
      if (!canPickBrowserDirectory) {
        browse.disabled = true;
        load.disabled = true;
        error.textContent = "请使用 Chrome 或 Edge 打开此页面，或在本机双击启动脚本。";
      }
    }
    const close = () => { panel.remove(); resolve(); };
    panel.querySelector<HTMLButtonElement>("[data-skip]")!.addEventListener("click", close);
    browse.addEventListener("click", async () => {
      error.textContent = "";
      browse.disabled = true;
      try {
        if (canPickBrowserDirectory) {
          chosenDirectory = await pickBrowserDirectory();
          input.value = chosenDirectory.name;
          input.readOnly = true;
          return;
        }
        if (!localServer) throw new Error("此浏览器不支持选择文件夹，请使用 Chrome 或 Edge。");
        const response = await fetch("/api/music/pick", { method: "POST" });
        const body = await response.text();
        let result: { directory?: string; error?: string };
        try { result = JSON.parse(body); }
        catch { throw new Error("当前页面没有本机选目录服务。请使用 Chrome 或 Edge 选择文件夹，或双击本机启动脚本。"); }
        if (!response.ok) throw new Error(result.error || "无法打开文件夹选择窗口");
        if (result.directory) input.value = result.directory;
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (reason instanceof DOMException && (reason.name === "SecurityError" || reason.name === "NotAllowedError")) {
          error.textContent = "浏览器未开放文件夹访问。请从 Chrome 或 Edge 的完整窗口重新打开此页面。";
          return;
        }
        error.textContent = reason instanceof Error ? reason.message : "无法打开文件夹选择窗口";
      } finally { browse.disabled = false; input.focus(); }
    });
    panel.querySelector("form")!.addEventListener("submit", async event => {
      event.preventDefault();
      error.textContent = "";
      if (!input.value.trim()) { error.textContent = "请先选择或输入音乐文件夹路径"; input.focus(); return; }
      load.disabled = true;
      try {
        if (chosenDirectory) await useBrowserDirectory(chosenDirectory);
        else await loadMusicLibrary(input.value.trim());
        location.reload();
      } catch (reason) {
        error.textContent = reason instanceof Error ? reason.message : "曲库载入失败";
        load.disabled = false;
      }
    });
    input.focus();
  });
}
