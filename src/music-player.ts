import { records, type Song } from "./data";
import { escapeHtml } from "./html";
import "./music-player.css";

const time = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
};

export class MusicPlayer {
  readonly audio = new Audio();
  private index = -1;
  private onSelect: (index: number) => void;
  private onError: (message: string) => void;
  private dock: HTMLElement;

  constructor(stage: HTMLElement, onSelect: (index: number) => void, onError: (message: string) => void) {
    this.onSelect = onSelect;
    this.onError = onError;
    this.audio.preload = "metadata";
    this.audio.volume = Number(localStorage.getItem("rhine-player-volume") ?? "0.7");
    this.dock = document.createElement("aside");
    this.dock.className = "music-dock";
    this.dock.hidden = true;
    stage.appendChild(this.dock);
    this.audio.addEventListener("timeupdate", () => this.sync());
    this.audio.addEventListener("durationchange", () => this.sync());
    this.audio.addEventListener("play", () => this.sync());
    this.audio.addEventListener("pause", () => this.sync());
    this.audio.addEventListener("ended", () => this.next(1));
    this.audio.addEventListener("error", () => this.onError("音频加载失败，请检查文件是否仍在曲库中"));
    document.addEventListener("click", event => {
      const button = (event.target as Element).closest<HTMLButtonElement>("[data-player]");
      if (!button) return;
      const action = button.dataset.player;
      if (action === "play") void this.toggle();
      if (action === "previous") this.next(-1);
      if (action === "next") this.next(1);
      if (action === "rewind") this.seek(this.audio.currentTime - 5);
      if (action === "forward") this.seek(this.audio.currentTime + 5);
      if (action === "mute") this.audio.muted = !this.audio.muted;
      this.sync();
    });
    document.addEventListener("input", event => {
      const input = event.target as HTMLInputElement;
      if (input.dataset.player === "progress") this.seek(Number(input.value));
      if (input.dataset.player === "volume") {
        this.audio.volume = Number(input.value) / 100;
        this.audio.muted = false;
        localStorage.setItem("rhine-player-volume", String(this.audio.volume));
        this.sync();
      }
    });
  }

  get currentIndex() { return this.index; }

  detail(song: Song | null) {
    if (!song) return `<div class="music-empty">曲库未连接。请在系统设置中指定可读取的音乐目录。</div>`;
    const cover = song.hasCover ? `<img src="/api/music/cover/${song.id}" alt="${escapeHtml(song.album)} 封面"/>` : `<span>RHINE<br/>MUSIC<br/>LIB</span>`;
    return `<div class="music-detail"><div class="music-kicker">AUDIO COLLECTION <span>／</span> ${String(song.id + 1).padStart(3, "0")}</div>
      <div class="music-heading"><h2>${escapeHtml(song.title)}</h2><p>${escapeHtml(song.artist)} <span>／</span> ${escapeHtml(song.album)}</p></div>
      <div class="music-cover">${cover}<div class="music-disc"><i></i></div></div>
      <div class="music-controls" role="group" aria-label="播放控制">
        <div class="music-time"><span data-player-time>00:00</span><span data-player-duration>${time(song.duration ?? 0)}</span></div>
        <input type="range" data-player="progress" min="0" max="${song.duration || 100}" value="0" step="0.1" aria-label="播放进度"/>
        <div class="music-transport"><button data-player="previous" aria-label="上一首">Ⅰ◀</button><button data-player="rewind" aria-label="快退五秒">−5s</button><button class="music-play" data-player="play" aria-label="播放">▶</button><button data-player="forward" aria-label="快进五秒">+5s</button><button data-player="next" aria-label="下一首">▶Ⅰ</button></div>
        <div class="music-volume"><button data-player="mute" aria-label="静音">VOL</button><input type="range" data-player="volume" min="0" max="100" value="${Math.round(this.audio.volume * 100)}" aria-label="音量"/><span data-player-volume>${Math.round(this.audio.volume * 100)}%</span></div>
      </div></div>`;
  }

  async play(index: number) {
    const song = records[index]?.song;
    if (!song) return;
    if (this.index !== index) {
      this.index = index;
      this.audio.src = `/api/music/audio/${song.id}`;
      this.audio.load();
      this.onSelect(index);
    }
    try { await this.audio.play(); }
    catch { this.onError("播放未开始，请再次点击播放键"); }
    this.sync();
  }

  async toggle(index?: number) {
    if (index !== undefined && index !== this.index) return this.play(index);
    if (this.index < 0) return this.play(0);
    if (this.audio.paused) {
      try { await this.audio.play(); }
      catch { this.onError("播放未开始，请再次点击播放键"); }
    } else this.audio.pause();
    this.sync();
  }

  next(direction: number) {
    const playable = records.map((record, index) => record.song ? index : -1).filter(index => index >= 0);
    if (!playable.length) return;
    const current = playable.indexOf(this.index);
    const position = current < 0 ? (direction > 0 ? 0 : playable.length - 1) : (current + direction + playable.length) % playable.length;
    void this.play(playable[position]);
  }

  seek(seconds: number) {
    if (Number.isFinite(this.audio.duration)) this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration));
    this.sync();
  }

  showDock(visible: boolean) { this.dock.hidden = !visible || this.index < 0; }

  sync() {
    const shownDuration = Number(document.querySelector<HTMLInputElement>('[data-player="progress"]')?.max ?? 0);
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : records[this.index]?.song?.duration || shownDuration || 0;
    document.querySelectorAll<HTMLInputElement>('[data-player="progress"]').forEach(input => {
      input.max = String(duration || 100);
      input.value = String(Math.min(this.audio.currentTime || 0, duration || 100));
    });
    document.querySelectorAll<HTMLElement>("[data-player-time]").forEach(node => node.textContent = time(this.audio.currentTime));
    document.querySelectorAll<HTMLElement>("[data-player-duration]").forEach(node => node.textContent = time(duration));
    document.querySelectorAll<HTMLElement>("[data-player-volume]").forEach(node => node.textContent = this.audio.muted ? "MUTE" : `${Math.round(this.audio.volume * 100)}%`);
    document.querySelectorAll<HTMLInputElement>('[data-player="volume"]').forEach(input => input.value = String(Math.round(this.audio.volume * 100)));
    document.querySelectorAll<HTMLButtonElement>('[data-player="play"]').forEach(button => {
      button.textContent = this.audio.paused ? "▶" : "Ⅱ";
      button.setAttribute("aria-label", this.audio.paused ? "播放" : "暂停");
    });
    const song = records[this.index]?.song;
    if (song && this.dock.dataset.songId !== String(song.id)) {
      this.dock.dataset.songId = String(song.id);
      this.dock.innerHTML = `<span>RHINE MUSIC LIB / ${escapeHtml(song.title)}</span><button data-player="previous" aria-label="上一首">Ⅰ◀</button><button data-player="play" aria-label="播放">▶</button><button data-player="next" aria-label="下一首">▶Ⅰ</button><span data-dock-time></span>`;
    }
    this.dock.querySelector<HTMLElement>("[data-dock-time]")?.replaceChildren(`${time(this.audio.currentTime)} / ${time(duration)}`);
  }
}
