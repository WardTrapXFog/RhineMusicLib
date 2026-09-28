import { loadMusicLibrary } from "./data";
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
      <form><label for="library-directory">MUSIC DIRECTORY / 本地路径</label><div class="library-setup-field"><input id="library-directory" name="directory" autocomplete="off" spellcheck="false" placeholder="选择或输入音乐文件夹路径"/><button type="button" data-browse>浏览…</button></div><div class="library-setup-error" role="status"></div><div class="library-setup-actions"><button type="button" data-skip>跳过，进入空白展厅</button><button type="submit" data-load>载入曲库 ↗</button></div></form>
      <div class="library-setup-foot">LOCAL AUDIO ACCESS <span>●</span> 文件仅由本机服务读取</div>
    </section>`;
    document.body.appendChild(panel);
    const input = panel.querySelector<HTMLInputElement>("input")!;
    const error = panel.querySelector<HTMLElement>(".library-setup-error")!;
    const load = panel.querySelector<HTMLButtonElement>("[data-load]")!;
    const browse = panel.querySelector<HTMLButtonElement>("[data-browse]")!;
    const close = () => { panel.remove(); resolve(); };
    panel.querySelector<HTMLButtonElement>("[data-skip]")!.addEventListener("click", close);
    browse.addEventListener("click", async () => {
      error.textContent = "";
      browse.disabled = true;
      try {
        const response = await fetch("/api/music/pick", { method: "POST" });
        const result = await response.json() as { directory?: string; error?: string };
        if (!response.ok) throw new Error(result.error || "无法打开文件夹选择窗口");
        if (result.directory) input.value = result.directory;
      } catch (reason) {
        error.textContent = reason instanceof Error ? reason.message : "无法打开文件夹选择窗口";
      } finally { browse.disabled = false; input.focus(); }
    });
    panel.querySelector("form")!.addEventListener("submit", async event => {
      event.preventDefault();
      error.textContent = "";
      if (!input.value.trim()) { error.textContent = "请先选择或输入音乐文件夹路径"; input.focus(); return; }
      load.disabled = true;
      try {
        await loadMusicLibrary(input.value.trim());
        location.reload();
      } catch (reason) {
        error.textContent = reason instanceof Error ? reason.message : "曲库载入失败";
        load.disabled = false;
      }
    });
    input.focus();
  });
}
