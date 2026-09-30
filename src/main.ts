import { createRollingClock } from "./rolling-clock";
import { InspectionOverlay } from "./inspection-overlay";
import { DocumentDecryption } from "./document-decryption";
import "./document-decryption.css";
import "./decryption.css";
import { escapeHtml } from "./html";
import { normalizeQuality, qualityPresets, type QualityPreset, type RenderQuality } from "./render-quality";
import { qualityMarkup, syncQualityUI } from "./quality-settings";
import { superPerformanceQuality, wallpaperQuality } from "./wallpaper-quality";
import "@kitlangton/rolling-number/styles.css";
import "./style.css";
import "./quality-settings.css";
import "./responsive.css";
import { viewportLayout, openingLayout } from "./viewport-layout";
import { assetUrl } from "./asset-url";
import { initPwa, pwaSettingsMarkup } from "./pwa";
import { createRollingNumber, createRollingText } from "@kitlangton/rolling-number";
import { ArchiveScene } from "./scene";
import { ModelViewer } from "./model-viewer";
import { ContentTransition, SurfaceTransition } from "./ui-transitions";
import { BootSequence } from "./boot";
import { loadBootWebfonts } from "./boot-lettering";
import { wrap, type ArchiveNavigation } from "./archive-loop";
import {
  records,
  categories,
  archiveColumns,
  columnFiles,
  fileLocation,
  musicDirectory,
  browserLibraryActive,
  musicError,
  loadMusicLibrary,
  musicGrouping,
  setMusicGrouping,
  playbackOrder,
} from "./data";
import { durationLabel, type MusicGrouping } from "./music-catalog";
import { MusicPlayer } from "./music-player";
import { chooseMusicDirectory } from "./library-setup";
import "./empty-gallery.css";
import { TerminalAudio } from "./audio";
import { audioSettingsMarkup } from "./audio-settings";
import {
  createMotionPreferences,
  fullMotion,
  motionEnabled,
  motionPresetFor,
  motionSettingsMarkup,
  motionSummary,
  reducedMotion,
  type MotionKey,
  type MotionPreset,
  type StoredMotion,
} from "./motion-preferences";
import { StartupGate } from "./startup";
import { isWallpaper, wallpaperHost, wallpaperFrame, type WallpaperProperties } from "./wallpaper";
import "./startup.css";
import "./wallpaper.css";
import { Workbench } from "./workbench";
let workbench: Workbench | undefined;
import { ArchivePlayground } from "./archive-playground";
import { ARRAY_OPENING_END, openingShowsDetail } from "./wallpaper-opening";
import { paintTheme, themeSettingsMarkup } from "./theme-ui";
let playground: ArchivePlayground | undefined;
import { WallpaperEffects } from "./wallpaper-effects";
import { WallpaperBackground } from "./wallpaper-background";
let wallpaperEffects: WallpaperEffects | undefined;

const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
import { logo, brandHeading } from "./brand";

$("#stage").innerHTML = `
  <div id="three-scene" class="three-scene"></div>
  <div class="scene-atmosphere archive-atmosphere"></div>
  <div id="boot-background" class="boot-background"><svg viewBox="0 0 1920 1080" preserveAspectRatio="none"><g fill="none" stroke="#fff" stroke-width="3"><path d="M-210 705C-45 705 182 704 247 567C337 377 99 306 4 435S27 680 169 631C309 584 227 314 279 111S568-113 568-113"/><path d="M1560-80C1374 114 1671 168 1601 323S1371 367 1431 480S1692 666 1559 787S1329 886 1498 1130"/><circle cx="1450" cy="648" r="346"/><circle cx="1450" cy="648" r="348"/></g></svg></div>
  <header class="brand">${brandHeading}</header>
  <nav class="system-nav" aria-label="系统导航">
    <button data-action="search"><span class="nav-glyph">⌕</span> MUSIC INDEX <span class="key">/</span></button>
    <button data-action="saved" aria-label="查看收藏歌曲" title="收藏歌曲">＋ SAVED <span id="saved-count">00</span></button>
    <button data-action="theme-toggle" aria-label="切换夜间模式" aria-pressed="false">◐ <span class="theme-toggle-label">夜间</span></button>
    <button class="settings-button" data-action="settings" aria-label="系统设置" title="系统设置"><span class="settings-glyph" aria-hidden="true">◷</span><span class="settings-label">设置</span></button>
  </nav>
  <button id="skip" class="skip" data-action="skip">ENTER SYSTEM <span>↗</span></button>
  <section id="boot" class="boot" aria-label="系统启动">
    <div class="access-text">ACCESS</div>
    <div class="boot-logo">${logo}</div>
    <div class="auth-status"><span>▪</span> <span id="auth-message"></span><i></i></div>
    <div class="scan"><svg viewBox="0 0 1920 1080" aria-hidden="true"><g fill="none" stroke="#080a08" stroke-width="2" stroke-linecap="round"><path/><path stroke="#fff"/><path/><path/><path/><path/><circle class="orbit-dot" r="8" fill="#ed821b" stroke="none"/><circle class="orbit-dot" r="8" fill="#ed821b" stroke="none"/><circle class="scan-core" cx="960" cy="540" r="5" fill="#080a08" stroke="none"/></g></svg><span>PERMISSION AUTHORIZED</span></div>
    <div class="welcome"><div class="welcome-panel"></div><div class="welcome-heading">WELCOME TO</div><div class="welcome-company"><strong>RHINE MUSIC LIB</strong><strong class="welcome-highlight" aria-hidden="true">RHINE MUSIC LIB</strong></div><div class="welcome-database">AUDIO COLLECTION</div><div class="welcome-logo">${logo}</div></div>
  </section>
  <svg id="inspection-marks" viewBox="0 0 1920 1080" aria-hidden="true"><path id="inspection-lines"/><g id="inspection-corners"></g><circle id="inspection-point" r="1.8"/></svg>
  <div id="inspection-text" aria-hidden="true">CONFIDENTIALITY:<strong>GENERAL BUSINESS USE</strong></div>
  <section id="archive-ui" class="archive-ui" aria-label="歌曲展厅">
    <div class="collection-toolbar"><span>COLLECTION / 陈列</span><div role="group" aria-label="歌曲分类"><button data-grouping="all">全部</button><button data-grouping="album">专辑</button><button data-grouping="artist">歌手</button></div><label><span class="sr-only">跳转分类</span><select id="collection-group" aria-label="跳转分类"></select></label></div>
    <div id="empty-gallery" class="empty-gallery"><span>AUDIO COLLECTION / 000</span><h2>展厅尚无歌曲</h2><p>选择本机音乐文件夹，即可将歌曲陈列在这里。</p><button data-action="choose-music">选择音乐目录 ↗</button></div>
    <div class="archive-callout"><div class="eyebrow">AUDIO COLLECTION <span>／</span> <span id="archive-category">声音档案 01</span></div><button class="file-title" data-action="open">TRACK NUMBER: <span id="selected-id">M-<span id="selected-code">001</span></span><span class="file-open">↗</span></button><div class="callout-rule"><i></i></div><div class="file-summary"><span id="selected-title">曲库载入中</span><span id="selected-clearance">READY TO PLAY</span></div><button class="read-file" data-action="open">PLAY TRACK <span>→</span></button></div>
    <div id="hover-label" class="hover-label" hidden>M-<span id="hover-code">001</span> / <span id="hover-title"></span></div>
    <div class="archive-counter"><span class="tiny-label">TRACK / SELECT</span><div><span id="selected-number">01</span><i>/</i><span class="count-total">12</span></div></div>
    <div class="archive-navigation"><button data-action="prev" aria-label="上一个档案">↑</button><div id="file-ticks" class="file-ticks"></div><button data-action="next" aria-label="下一个档案">↓</button></div>
    <div class="column-navigation"><button data-action="column-prev" aria-label="上一列">←</button><div><span id="column-number">COLLECTION <span id="column-index">01</span> / <span id="column-total">${String(archiveColumns.length).padStart(2, "0")}</span></span><strong id="column-name">声音档案 01</strong></div><button data-action="column-next" aria-label="下一列">→</button></div>
    <div class="archive-hint"><kbd>←</kbd> <kbd>→</kbd> 切换列 <span>／</span> <kbd>↑</kbd> <kbd>↓</kbd> 前后档案 <span>／</span> <kbd>ENTER</kbd> 读取</div>
  </section>
  <section id="detail-ui" class="detail-ui" aria-label="歌曲播放" hidden>
    <button class="back-button" data-action="back">← <span>MUSIC COLLECTION</span><small>ESC</small></button>
    <div class="object-caption"><span id="object-id">NO.001</span><div>AUDIO COLLECTION</div><small>DRAG TO INSPECT <span>↔</span></small><button class="viewer-open" data-action="model-viewer">360° 查看 CD 盒 <span>↗</span></button></div>
    <article id="detail-content" class="detail-content"></article>
  </section>
  <div class="powered">POWERED BY <b>RHINE LAB</b><i></i></div>
  <footer class="system-footer"><span><i class="status-light"></i> SESSION AUTHORIZED${isWallpaper ? '<button type="button" class="three-toggle" data-action="toggle-three" aria-pressed="true" title="卸载三维模型，保留 2D 界面">3D 开启</button>' : ''}</span><span>JOYCE MOORE <i>／</i> <span id="clock">00:00:00</span></span><button data-action="replay" title="重播启动流程">REINITIALIZE ↗</button></footer>
  <div id="pwa-update-notice" class="pwa-update-notice" role="status" hidden><span>新版本已就绪</span><button data-pwa-action="update">更新并重启 ↻</button></div>
  <div id="modal-root"></div><div id="toast" class="toast" role="status"></div>
  <div id="loading" class="loading"><div class="loading-mark">${logo}</div><span>CONNECTING TO AUDIO COLLECTION</span><i></i></div>
`;
$("#stage").dataset.empty = String(records.length === 0);

$("#boot-background").insertAdjacentHTML(
  "beforeend",
  '<div class="boot-white"></div>',
);
const bootSequence = new BootSequence($("#stage"));
$("#viewport").insertAdjacentHTML("beforeend", '<button class="mobile-entry" data-action="skip">进入曲库 <span>→</span></button>');

type Mode = "boot" | "archive" | "detail";
let mode: Mode = "boot",
  selected = playbackOrder()[0] ?? 0,
  bootStart = 0,
  lastStep = "",
  ready = false;
let modal: "search" | "saved" | "settings" | null = null,
  searchQuery = "",
  filter = "全部歌曲";
let activeTab = "overview";
const reviewParams = new URLSearchParams(location.search);
let frozenTime =
  reviewParams.get("freeze") === "1"
    ? Number(reviewParams.get("time") ?? 0)
    : null;
if (reviewParams.get("review") === "1") {
  $("#stage").dataset.review = "true";
  window.addEventListener("message", (event) => {
    if (
      event.origin !== location.origin ||
      event.source !== window.parent ||
      event.data?.type !== "rhine-review-frame"
    )
      return;
    const t = Number(event.data.time);
    if (!Number.isFinite(t) || t < 0 || t >= 35) return;
    frozenTime = t;
    if (ready && mode !== "boot") setMode("boot");
  });
}
let toastTimer: ReturnType<typeof setTimeout>;
let previousFocus: HTMLElement | null = null;
const detailTransition = new SurfaceTransition($("#detail-ui"), undefined, 180, 180);
const tabTransition = new ContentTransition();
let modalTransition: SurfaceTransition | undefined;
let modalClosing = false;
let modalSiblings: { node: HTMLElement; inert: boolean }[] = [];
let pendingDetailFocus = false;
let bookmarkFeedback: Animation | undefined;
function readLocal<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}
const saved = new Set<string>(readLocal<string[]>("rhine-saved", []));
const storedPrefs = readLocal<Partial<{ sound: boolean; music: boolean; soundVolume: number; musicVolume: number; reduced: boolean; quality: boolean; rendering: RenderQuality; superPerformance: boolean; colorTheme: "light" | "dark"; motion: StoredMotion; motionPreset: MotionPreset }>>("rhine-settings", {});
const initialMotion = createMotionPreferences(
  storedPrefs.motion,
  storedPrefs.reduced ?? (storedPrefs.motion === undefined
    ? matchMedia("(prefers-reduced-motion: reduce)").matches
    : undefined),
);
const initialMotionPreset = motionPresetFor(initialMotion);
const prefs = {
  sound: storedPrefs.sound ?? true,
  music: storedPrefs.music ?? storedPrefs.sound ?? true,
  soundVolume: storedPrefs.soundVolume ?? .55,
  musicVolume: storedPrefs.musicVolume ?? .5,
  motion: initialMotion,
  motionPreset: initialMotionPreset,
  quality: storedPrefs.quality ?? true,
  superPerformance: storedPrefs.superPerformance ?? false,
  rendering: normalizeQuality(storedPrefs.rendering, storedPrefs.quality !== false),
  colorTheme: storedPrefs.colorTheme === "dark" ? "dark" : "light",
};
const motionActive = (key: MotionKey) => motionEnabled(prefs.motion, key);
const motionIsReduced = () => Object.values(prefs.motion).every((value) => !value);
paintTheme(prefs.colorTheme === "dark" ? 1 : 0);
const rollingMotion = {
  duration: 460,
  motionBlur: true,
  animated: motionActive("rollingNumbers"),
};
const updateFooterClock = createRollingClock($("#clock"));
const numberOptions = {
  ...rollingMotion,
  locales: "en-US",
  format: { minimumIntegerDigits: 2, useGrouping: false },
};
const fileCounter = createRollingNumber($("#selected-number"), {
  ...numberOptions,
  value: 1,
});
const columnCounter = createRollingNumber($("#column-index"), {
  ...numberOptions,
  value: 1,
});
const codeOptions = {
  ...numberOptions,
  format: { minimumIntegerDigits: 3, useGrouping: false },
  value: 1,
};
const textOptions = {
  ...rollingMotion,
  animated: motionActive("rollingText"),
  transition: "direct" as const,
  stagger: "none" as const,
};
const selectionTitle = createRollingText($("#selected-title"), {
  ...textOptions,
  text: $("#selected-title").textContent ?? "",
});
const columnTitle = createRollingText($("#column-name"), {
  ...textOptions,
  text: $("#column-name").textContent ?? "",
});
const hoverTitle = createRollingText($("#hover-title"), { ...textOptions, text: "" });
const categoryTitle = createRollingText($("#archive-category"), {
  ...textOptions,
  text: $("#archive-category").textContent ?? "",
});
const clearanceTitle = createRollingText($("#selected-clearance"), {
  ...textOptions,
  text: $("#selected-clearance").textContent ?? "",
});
const rollingTitles = [selectionTitle, columnTitle, hoverTitle, categoryTitle, clearanceTitle];
const selectedCode = createRollingNumber($("#selected-code"), codeOptions);
const hoverCode = createRollingNumber($("#hover-code"), codeOptions);
const audio = new TerminalAudio();
let musicSuppressed = false;
function configureAudio() { audio.configure({ ...prefs, music: false }); }
configureAudio();
const player = new MusicPlayer($("#stage"), index => {
  if (selected !== index) {
    selected = index;
    columnMemory[fileLocation(selected).lane] = selected;
    scene?.select(selected);
    updateSelection();
  }
  if (mode === "detail") renderDetail();
}, notify);
const reviewEntry = reviewParams.has("scene") || reviewParams.has("time") || reviewParams.get("review") === "1";
let started = false;
const loading = $("#loading");
// The entry screen uses the actual viewport, including portrait phones; the
// reference animation still uses its calibrated 1920 x 1080 stage.
$("#viewport").append(loading);
$("#stage").inert = true;
$(".mobile-entry").inert = true;
const entry = !isWallpaper && !reviewEntry && prefs.sound ? new StartupGate({
  root: loading,
  unlock: () => audio.unlock(),
  cancel: () => audio.cancelEntry(),
  start: silent => completeStartup(silent),
}) : undefined;
if (entry) {
  audio.holdForEntry();
}
let audioPreview = false, audioPreviewRequest = 0;
let scene: ArchiveScene | undefined;
let threeState: "on" | "closing" | "off" | "loading" = "on";
let resumeCell: { lane: number; row: number } | undefined;
let resumeSelection = -1;
let viewer: ModelViewer | undefined;
const accessLog: { id: string; time: string }[] = [];
const columnMemory = archiveColumns.map((_, lane) => columnFiles(lane)[0]);
function recordAccess() {
  accessLog.unshift({
    id: records[selected].id,
    time: new Date().toLocaleTimeString("en-GB"),
  });
}
function saveAudioPrefs() {
  try {
    localStorage.setItem("rhine-settings", JSON.stringify(prefs));
  } catch {}
  configureAudio();
}
function superPerformanceEnabled() { return isWallpaper ? wallpaperHost()?.properties.superperformance?.value === true : prefs.superPerformance; }
function effectiveRenderQuality() { return superPerformanceEnabled() ? superPerformanceQuality : prefs.rendering; }
function savePrefs() {
  saveAudioPrefs();
  if (!motionActive("rollingText")) rollingTitles.forEach(title => title.finish());
  if (!motionActive("rollingNumbers")) [fileCounter, columnCounter, selectedCode, hoverCode].forEach(counter => counter.finish());
  if (!motionActive("surfaceTransitions")) {
    detailTransition.finish();
    modalTransition?.finish();
    tabTransition.finish();
    bookmarkFeedback?.cancel();
  }
  scene?.setMotion(prefs.motion);
  scene?.setTheme(prefs.colorTheme === "dark", !motionActive("surfaceTransitions") || !started);
  document.querySelectorAll<HTMLElement>("[data-color-theme]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.colorTheme === prefs.colorTheme)));
  syncThemeToggle();
  scene?.setSuperPerformance(superPerformanceEnabled());
  viewer?.setSuperPerformance(superPerformanceEnabled());
  scene?.setQuality(effectiveRenderQuality());
  viewer?.setQuality(effectiveRenderQuality());
  viewer?.setMotion(prefs.motion);
  syncQualityUI(prefs.rendering);
  updateQualitySummary();
  fileCounter.update({ animated: motionActive("rollingNumbers") && mode === "archive" });
  rollingTitles.forEach(title => title.update({ animated: motionActive("rollingText") && mode === "archive" }));
  columnCounter.update({ animated: motionActive("rollingNumbers") && mode === "archive" });
  selectedCode.update({ animated: motionActive("rollingNumbers") && mode === "archive" });
  hoverCode.update({ animated: motionActive("rollingNumbers") && mode === "archive" });
  $("#stage").classList.toggle("reduce-motion", motionIsReduced());
  $("#stage").classList.toggle("reduce-surfaces", !motionActive("surfaceTransitions"));
  workbench?.setMotion(prefs.motion);
  updateFooterClock(new Date(), motionActive("rollingNumbers"));
  syncWallpaperBackground();
}
function syncThemeToggle() {
  const dark = prefs.colorTheme === "dark";
  $('[data-action="theme-toggle"]').setAttribute("aria-pressed", String(dark));
  $('[data-action="theme-toggle"]').setAttribute("aria-label", dark ? "切换日间模式" : "切换夜间模式");
  $(".theme-toggle-label").textContent = dark ? "日间" : "夜间";
}
syncThemeToggle();
function syncCollectionControls() {
  document.querySelectorAll<HTMLElement>("[data-grouping]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.grouping === musicGrouping)));
  $("#collection-group").innerHTML = archiveColumns.map((name, lane) => `<option value="${lane}">${escapeHtml(name)} · ${columnFiles(lane).length} 首</option>`).join("");
  $("#column-total").textContent = String(archiveColumns.length).padStart(2, "0");
}
syncCollectionControls();
document.addEventListener("change", event => {
  if ((event.target as HTMLElement).id !== "collection-group") return;
  const lane = Number((event.target as HTMLSelectElement).value);
  if (ready && mode === "archive" && !modal) select(columnMemory[lane]);
});
let previousLayout = "";
function fit() {
  const stage = $("#stage");
  const viewport = $("#viewport");
  const coarse = matchMedia("(pointer: coarse)").matches;
  const reference = reviewParams.has("time") || reviewParams.get("review") === "1";
  const { width, height, scale, kind } = mode === "boot" && !reference
    ? openingLayout(viewport.clientWidth, viewport.clientHeight)
    : viewportLayout(viewport.clientWidth, viewport.clientHeight, coarse, mode === "boot");
  stage.style.width = `${width}px`;
  stage.style.height = `${height}px`;
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  stage.dataset.layout = kind;
  stage.dataset.touch = String(coarse);
  viewport.dataset.mobileBoot = String(mode === "boot" && (coarse || viewport.clientWidth < 1100));
  stage.style.setProperty("--stage-scale", String(scale));
  stage.style.setProperty("--opening-width", `${width}px`);
  stage.style.setProperty("--opening-height", `${height}px`);
  stage.style.setProperty("--opening-scan-scale", String(Math.min(1, width / 1920)));
  stage.dataset.openingPortrait = String(width < height);
  // The software keyboard resizes dialogs without recomposing the 3D scene.
  const visible = window.visualViewport;
  const stageTop = (viewport.clientHeight - height * scale) / 2;
  stage.style.setProperty("--modal-top", `${Math.max(0, (visible?.offsetTop ?? 0) - stageTop) / scale}px`);
  stage.style.setProperty("--modal-height", `${Math.min(height, (visible?.height ?? viewport.clientHeight) / scale)}px`);
  $("#viewport").style.setProperty("--scale", String(scale));
  const marks = document.querySelector("#inspection-marks");
  marks?.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const layoutKey = JSON.stringify([width, height, scale, kind, devicePixelRatio]);
  if (layoutKey !== previousLayout) {
    previousLayout = layoutKey;
    scene?.resize();
    viewer?.resize();
  }
  updateQualitySummary();
  // Re-measure line covers and tab underline after wrapping changes.
  requestAnimationFrame(() => {
    documentDecryption.refresh();
    const tab = document.querySelector<HTMLElement>(".detail-tabs button.active");
    const indicator = document.querySelector<HTMLElement>(".tab-indicator");
    if (tab && indicator) indicator.style.transform = `translateX(${tab.offsetLeft}px) scaleX(${tab.offsetWidth})`;
  });
}
window.addEventListener("resize", fit);
window.visualViewport?.addEventListener("resize", fit);
window.visualViewport?.addEventListener("scroll", fit);
matchMedia("(pointer: coarse)").addEventListener("change", fit);
fit();
let fileTicks: HTMLButtonElement[] = [];

function setMode(next: Mode) {
  if (next === "detail" && !records.length) next = "archive";
  if (workbench?.enabled && next === "detail") next = "archive";
  const previousMode = mode;
  rollingTitles.forEach(title => title.update({ animated: motionActive("rollingText") && next === "archive" }));
  if (next !== "archive") {
    rollingTitles.forEach(title => title.finish());
    hoverCode.finish();
    $("#hover-label").hidden = true;
  }
  if (next === "detail" && mode !== "detail") recordAccess();
  mode = next;
  player.showDock(next === "archive");
  syncWallpaperBackground();
  audio.setScene(next);
  if (next !== "boot" && audioPreview) {
    audioPreview = false;
    audioPreviewRequest++;
    configureAudio();
  }
  $("#stage").dataset.mode = next;
  workbench?.syncVisibility();
  if (previousMode !== next) fit();
  $("#boot").inert = next !== "boot";
  $("#boot").setAttribute("aria-hidden", String(next !== "boot"));
  $("#archive-ui").inert = next !== "archive" || Boolean(modal) || Boolean(workbench?.enabled);
  $("#archive-ui").setAttribute("aria-hidden", String(next !== "archive" || Boolean(workbench?.enabled)));
  $(".system-nav").inert = next === "boot" || Boolean(modal);
  $(".system-footer").inert = next === "boot" || Boolean(modal);
  if (next === "detail") {
    if (previousMode !== "detail") detailTransition.show(!motionActive("surfaceTransitions"));
  } else if (previousMode === "detail" || (next === "boot" && !$("#detail-ui").hidden)) {
    pendingDetailFocus = false;
    tabTransition.cancel();
    detailTransition.hide(!motionActive("surfaceTransitions") || next === "boot");
    if (!modal && next === "archive") $(".read-file").focus({ preventScroll: true });
  }
  $("#detail-ui").inert = next !== "detail" || Boolean(modal);
  scene?.setMode(next === "boot" ? "hidden" : next);
  if (next !== "boot") {
    bootSequence.reset();
    $(".file-title").firstChild!.textContent = "TRACK NUMBER: ";
    $("#stage").dataset.boot = "done";
  }
  if (next === "detail" && previousMode !== "detail") {
    renderDetail();
    pendingDetailFocus = true;
    if (!scene) {
      $("#detail-content").style.opacity = "1";
      $("#detail-content").style.translate = "0 0";
      $("#detail-content").inert = false;
    }
  }
}
function select(index: number, navigation?: ArchiveNavigation) {
  if (!records.length) return;
  selected = (index + records.length) % records.length;
  columnMemory[fileLocation(selected).lane] = selected;
  if (mode === "detail") setMode("archive");
  activeTab = "overview";
  scene?.select(selected, navigation);
  updateSelection(navigation);
  const columnMove = navigation && "axis" in navigation && navigation.axis === "lane";
  audio.play(columnMove ? "column" : "tick", columnMove ? navigation.direction * .45 : 0);
}
function stepFile(direction: number) {
  if (!records.length) return;
  const files = columnFiles(fileLocation(selected).lane);
  if (files.length < 2) return;
  select(
    files[(files.indexOf(selected) + direction + files.length) % files.length],
    { axis: "row", direction },
  );
}
function stepColumn(direction: number) {
  if (!records.length) return;
  if (archiveColumns.length < 2) return;
  const lane = fileLocation(selected).lane;
  const next = wrap(lane + direction, archiveColumns.length);
  select(columnMemory[next], { axis: "lane", direction });
}
function updateSelection(navigation?: ArchiveNavigation) {
  if (!records.length) return;
  const r = records[selected];
  const { lane } = fileLocation(selected);
  const files = columnFiles(lane);
  $<HTMLSelectElement>("#collection-group").value = String(lane);
  selectionTitle.update({ text: r.title, animated: motionActive("rollingText") && mode === "archive" });
  clearanceTitle.update({ text: r.clearance, animated: motionActive("rollingText") && mode === "archive" });
  categoryTitle.update({ text: r.category, animated: motionActive("rollingText") && mode === "archive" });
  const direction =
    navigation && "axis" in navigation
      ? navigation.direction > 0
        ? "up"
        : "down"
      : "auto";
  selectedCode.update({
    value: Number(r.id.slice(2)),
    animated: motionActive("rollingNumbers") && mode === "archive",
    direction,
  });
  fileCounter.update({
    value: files.indexOf(selected) + 1,
    animated: motionActive("rollingNumbers") && mode === "archive",
    direction:
      navigation && "axis" in navigation && navigation.axis === "row"
        ? direction
        : "auto",
  });
  $(".count-total").textContent = String(files.length).padStart(2, "0");
  columnCounter.update({
    value: lane + 1,
    animated: motionActive("rollingNumbers") && mode === "archive",
    direction:
      navigation && "axis" in navigation && navigation.axis === "lane"
        ? direction
        : "auto",
  });
  columnTitle.update({ text: archiveColumns[lane], animated: motionActive("rollingText") && mode === "archive" });
  $<HTMLButtonElement>('[data-action="column-prev"]').disabled = archiveColumns.length < 2;
  $<HTMLButtonElement>('[data-action="column-next"]').disabled = archiveColumns.length < 2;
  if (fileTicks.length !== files.length) {
    $("#file-ticks").innerHTML = files.map(index => `<button data-select="${index}"></button>`).join("");
    fileTicks = [...$("#file-ticks").querySelectorAll<HTMLButtonElement>("button")];
  }
  fileTicks.forEach((button, slot) => {
    const index = files[slot], record = records[index];
    button.dataset.select = String(index);
    button.setAttribute("aria-label", `选择歌曲 ${record.id} ${record.title}`);
    button.title = `${record.id} · ${record.title}`;
    button.classList.toggle("selected", index === selected);
    button.setAttribute("aria-pressed", String(index === selected));
  });
  const activeTick = fileTicks.find(button => button.dataset.select === String(selected));
  if (activeTick) $("#file-ticks").scrollLeft = activeTick.offsetLeft - $("#file-ticks").clientWidth / 2;
  $("#saved-count").textContent = String(saved.size).padStart(2, "0");
}
function replayBoot(forcePreview = false) {
  if (!ready) return;
  closeModal(() => replayBootAfterModal(forcePreview));
}
function replayBootAfterModal(forcePreview: boolean) {
  bootStart = performance.now() / 1000 - 1.76;
  frozenTime = null;
  lastStep = "";
  setMode(!motionActive("boot") && !forcePreview ? "archive" : "boot");
  audio.restartBoot();
  selected = playbackOrder()[0] ?? 0;
  if (records.length) scene?.select(selected);
  updateSelection();
  if (!forcePreview) audio.play("ui-tick");
}
function openFile() {
  if (!ready || !records.length) return;
  closeModal(() => {
    setMode("detail");
    void player.play(selected);
    audio.play("open");
  });
}
function toggleSaved() {
  const id = records[selected].id;
  if (saved.has(id)) saved.delete(id);
  else saved.add(id);
  try {
    localStorage.setItem("rhine-saved", JSON.stringify([...saved]));
  } catch {}
  $("#saved-count").textContent = String(saved.size).padStart(2, "0");
  const button = $<HTMLButtonElement>('[data-action="bookmark"]');
  const added = saved.has(id);
  button.textContent = added ? "− REMOVE FROM SAVED / 取消收藏" : "＋ SAVE TRACK / 收藏歌曲";
  button.setAttribute("aria-pressed", String(added));
  bookmarkFeedback?.cancel();
  if (motionActive("surfaceTransitions")) bookmarkFeedback = button.animate(
    [{ backgroundColor: "#67634c" }, { backgroundColor: "#252820" }],
    { duration: 220, easing: "ease-out" },
  );
  audio.play("confirm");
  notify(saved.has(id) ? "歌曲已加入收藏" : "已取消收藏");
}
function renderDetail() {
  tabTransition.cancel();
  const r = records[selected];
  $("#object-id").textContent = "NO." + String(selected + 1).padStart(3, "0");
  $("#detail-content").innerHTML = `<header class="music-document-heading"><div class="detail-kicker"><span>RHINE MUSIC LIB / AUDIO ARCHIVE</span><span>${r.id}</span></div><h2>${escapeHtml(r.title)}</h2><div class="detail-title-cn">${escapeHtml(r.department)}<span>声音档案</span></div></header>
    <div class="detail-rule"></div>
    <dl class="metadata"><div><dt>ALBUM / 所属专辑</dt><dd>${escapeHtml(r.date)}</dd></div><div><dt>YEAR · TRACK / 年份 · 曲序</dt><dd>${escapeHtml(r.lead)} · ${r.song?.track ?? "未记录"}</dd></div></dl>
    ${player.detail(r.song)}
    <div class="detail-tabs" role="tablist" aria-label="声音档案资料"><button id="tab-overview" role="tab" data-tab="overview">DOSSIER <span>档案概览</span></button><button id="tab-notes" role="tab" data-tab="notes">ALBUM <span>专辑曲目</span></button><button id="tab-history" role="tab" data-tab="history">RECORD <span>载体记录</span></button><i class="tab-indicator"></i></div>
    <div id="tab-panel" class="tab-panel" role="tabpanel" tabindex="0"></div>
    <div class="music-document-footer"><button class="music-save" data-action="bookmark" aria-pressed="${saved.has(r.id)}">${saved.has(r.id) ? "− REMOVE FROM SAVED / 取消收藏" : "＋ SAVE TRACK / 收藏歌曲"}</button><span>LOCAL AUDIO / ${r.id}</span></div>`;
  $("#detail-content").setAttribute("tabindex", "-1");
  setTab(activeTab, false);
  documentDecryption.reset($("#detail-content"), !motionActive("documentReveal") || !scene);
  player.sync();
}
function overview() {
  const r = records[selected];
  const sameArtist = records.filter(record => record.song?.artist === r.song?.artist).length;
  return `<div class="panel-label">ARCHIVE ABSTRACT / 收录摘要</div><p>${escapeHtml(r.abstract)}</p><p>当前曲库收录该演出者的 ${sameArtist} 首作品。本页保留音源标签与专辑内曲序，可从专辑曲目切换音轨，或返回展厅继续查阅。</p>`;
}
function setTab(tab: string, sound = true) {
  if (sound && tab === activeTab) return;
  activeTab = tab;
  document.querySelectorAll("[data-tab]").forEach((b) => {
    const active = (b as HTMLElement).dataset.tab === tab;
    b.classList.toggle("active", active);
    b.setAttribute("aria-selected", String(active));
    b.setAttribute("tabindex", active ? "0" : "-1");
  });
  const r = records[selected];
  const tabButton = $<HTMLButtonElement>(`[data-tab="${tab}"]`);
  const indicator = $(".tab-indicator");
  indicator.style.transition = sound && motionActive("surfaceTransitions") ? "" : "none";
  indicator.style.transform = `translateX(${tabButton.offsetLeft}px) scaleX(${tabButton.offsetWidth})`;
  $("#tab-panel").setAttribute("aria-labelledby", tabButton.id);
  $("#tab-panel").innerHTML =
    tab === "overview"
      ? overview()
      : tab === "notes"
        ? `<div class="panel-label">ALBUM INDEX / ${escapeHtml(r.song?.album ?? "")}</div><div class="album-tracks">${records.map((record, index) => ({ record, index })).filter(({ record }) => record.song?.album === r.song?.album).sort((a, b) => (a.record.song?.track ?? Infinity) - (b.record.song?.track ?? Infinity) || a.record.title.localeCompare(b.record.title, "zh-CN", { numeric: true })).map(({ record, index }, position) => `<button data-album-track="${index}" aria-current="${index === selected ? "true" : "false"}"><span>${String(record.song?.track ?? position + 1).padStart(2, "0")}</span><span>${escapeHtml(record.title)}<small>${escapeHtml(record.department)}</small></span><time>${durationLabel(record.song?.duration ?? null)}</time><span aria-hidden="true">↗</span></button>`).join("")}</div>`
        : `<div class="panel-label">MEDIA RECORD / 载体记录</div><ol class="research-notes">${r.findings.map((f, i) => `<li><span>${String(i + 1).padStart(2, "0")}</span>${escapeHtml(f)}</li>`).join("")}</ol><p class="log-note">${escapeHtml(r.source)}</p>`;
  $("#tab-panel").scrollTop = 0;
  documentDecryption.refresh();
  if (sound) {
    tabTransition.reveal($("#tab-panel"), !motionActive("surfaceTransitions"));
    audio.play("ui-tick");
  }
}
function notify(message: string) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 2600);
}

function openModal(kind: NonNullable<typeof modal>) {
  if (!ready) return;
  if (!modal) {
    previousFocus = document.activeElement as HTMLElement;
    modalSiblings = [...$("#stage").children]
      .filter((node): node is HTMLElement => node instanceof HTMLElement && node.id !== "modal-root")
      .map((node) => ({ node, inert: node.inert }));
    modalSiblings.forEach(({ node }) => (node.inert = true));
  }
  modalClosing = false;
  modal = kind;
  searchQuery = "";
  filter = "全部歌曲";
  audio.play("page-open");
  renderModal();
}
function closeModal(afterClose?: () => void) {
  if (!modal) {
    afterClose?.();
    return;
  }
  if (modalClosing) return;
  modalClosing = true;
  audio.play("page-close");
  modalTransition!.hide(!motionActive("surfaceTransitions"), () => {
    modal = null;
    modalClosing = false;
    $("#modal-root").replaceChildren();
    modalTransition = undefined;
    modalSiblings.forEach(({ node, inert }) => (node.inert = inert));
    modalSiblings = [];
    $("#archive-ui").inert = mode !== "archive" || Boolean(workbench?.enabled);
    $("#detail-ui").inert = mode !== "detail";
    previousFocus?.focus({ preventScroll: true });
    afterClose?.();
  });
}
function renderModal() {
  if (!modal) return;
  modalTransition?.dispose();
  $("#modal-root").innerHTML =
    `<div class="modal-backdrop"><section class="terminal-modal ${modal === "settings" ? "settings-modal" : ""}" role="dialog" aria-modal="true" aria-label="${modal === "settings" ? "系统设置" : modal === "saved" ? "收藏歌曲" : "歌曲检索"}"><div class="modal-top"><span>RHINE LAB / ${modal === "settings" ? "SYSTEM PREFERENCES" : "MUSIC DIRECTORY"}</span><button data-action="close-modal" aria-label="关闭窗口">CLOSE <span>×</span></button></div>${modal === "settings" ? settingsMarkup() : `<h2>${modal === "saved" ? "SAVED TRACKS" : "MUSIC INDEX"}<small>${modal === "saved" ? "收藏歌曲" : "内部歌曲检索"}</small></h2><div class="search-field"><span>⌕</span><input id="archive-search" type="search" autocomplete="off" placeholder="输入歌曲编号、标题或艺术家" aria-label="检索档案"/><span class="key">ESC</span></div><div class="category-filters">${categories.map((c, i) => `<button data-filter="${escapeHtml(c)}" class="${i === 0 ? "active" : ""}">${escapeHtml(c)}</button>`).join("")}</div><div class="result-header"><span>TRACK / 歌曲</span><span>ARTIST / 艺术家</span><span>ACCESS</span></div><div id="search-results" class="search-results"></div><div class="modal-bottom"><span id="result-count"></span><span>AUDIO COLLECTION <i>●</i> CONNECTED</span></div>`}</section></div>`;
  const backdrop = $(".modal-backdrop");
  backdrop.hidden = true;
  modalTransition = new SurfaceTransition(backdrop, $(".terminal-modal"));
  modalTransition.show(!motionActive("surfaceTransitions"));
  if (modal === "settings") updateQualitySummary();
  if (modal !== "settings") {
    renderResults();
    requestAnimationFrame(() => {
      if (backdrop.isConnected && !modalClosing) $("#archive-search").focus();
    });
  } else
    requestAnimationFrame(() => {
      if (backdrop.isConnected && !modalClosing) $('[data-action="close-modal"]').focus();
    });
  $("#modal-root")
    .querySelector(".modal-backdrop")
    ?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
}
function renderResults() {
  const results = records
    .map((r, i) => ({ r, i }))
    .filter(
      ({ r }) =>
        (modal !== "saved" || saved.has(r.id)) &&
        (filter === "全部歌曲" || r.category === filter) &&
        `${r.id} ${r.title} ${r.date} ${r.department} ${r.lead}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
    );
  $("#search-results").innerHTML = results.length
    ? results
        .map(
          ({ r, i }) =>
            `<button class="result-row" data-result="${i}"><span class="result-name"><b>${r.id}</b><span>${escapeHtml(r.title)}<small>${escapeHtml(r.date)}</small></span>${saved.has(r.id) ? "<i>＋</i>" : ""}</span><span>${escapeHtml(r.department)}</span><span>PLAY <i>↗</i></span></button>`,
        )
        .join("")
    : `<div class="empty-results"><span>∅</span><strong>${modal === "saved" && !searchQuery ? "尚无收藏歌曲" : "没有匹配的歌曲"}</strong><p>${modal === "saved" && !searchQuery ? "播放歌曲时，选择 SAVE TRACK 将其保存在此处。" : "尝试其他标题、艺术家，或切换分列。"}</p><button data-action="reset-search">${modal === "saved" ? "查看全部歌曲 →" : "重置检索 →"}</button></div>`;
  $("#result-count").textContent =
    `${String(results.length).padStart(2, "0")} TRACKS FOUND`;
}
function updateQualitySummary() {
  const summary = document.querySelector("#quality-summary");
  if (!summary) return;
  if (!scene) { summary.textContent = "3D 已关闭 · 三维模型与渲染资源已释放"; return; }
  const canvas = scene.renderer.domElement;
  const metrics = JSON.parse(canvas.parentElement?.dataset.renderQuality ?? "{}");
  summary.textContent = `${superPerformanceEnabled() ? "超级性能模式已启用 · 画质设置暂被覆盖，关闭后恢复 · " : ""}实际渲染 ${canvas.width} × ${canvas.height} · ${effectiveRenderQuality().antialias === "smaa" ? "SMAA" : "原始抗锯齿"} · 纹理 ${metrics.anisotropy ?? 1}×${metrics.limited ? " · 已达到缓冲上限" : ""}`;
}
function motionPreferenceNoteMarkup() {
  const preset = prefs.motionPreset;
  const allEnabled = Object.values(prefs.motion).every(Boolean);
  return `<div id="motion-preference-note" class="motion-preference-note"><p>${motionSummary(prefs.motion)}</p><span>预设：${preset === "full" ? "完整动画" : preset === "reduced" ? "减少动画" : "自定义"} · 选择会保存在本站</span>${allEnabled ? "" : '<button data-action="enable-motion">启用完整动画并重播 ↻</button>'}</div>`;
}
function settingsMarkup() {
  return `<h2>SYSTEM SETTINGS<small>终端偏好设置</small></h2><p class="settings-intro">RHINE MUSIC LIB <span>·</span> LOCAL COLLECTION</p>
  <div class="music-library-setting"><strong>MUSIC DIRECTORY / 音乐目录</strong><p>${musicError ? escapeHtml(musicError) : `${records.length} 首歌曲${musicDirectory ? ` · ${escapeHtml(musicDirectory)}${browserLibraryActive ? "（浏览器授权）" : ""}` : " · 尚未选择目录"}`}</p><form id="music-library-form"><input name="directory" value="${browserLibraryActive ? "" : escapeHtml(musicDirectory)}" aria-label="音乐目录路径" spellcheck="false"/><button type="button" data-action="choose-music">选择文件夹</button><button type="submit">载入曲库 ↗</button></form></div>
  <div class="settings-list">${themeSettingsMarkup(prefs.colorTheme === "dark")}${!isWallpaper ? `<label><div><strong>SUPER PERFORMANCE</strong><span>降低三维画质和渲染分辨率，保留完整动效；关闭后恢复原画质</span></div><input type="checkbox" data-pref="superPerformance" ${prefs.superPerformance ? "checked" : ""}/><i class="toggle"></i></label>` : ""}${audioSettingsMarkup(prefs, false)}</div>${motionPreferenceNoteMarkup()}${motionSettingsMarkup(prefs.motion, prefs.motionPreset)}${qualityMarkup(prefs.rendering)}<div class="settings-shortcuts"><span>KEYBOARD CONTROLS</span><p><kbd>←</kbd><kbd>→</kbd> 切列 <kbd>↑</kbd><kbd>↓</kbd> 选曲 <kbd>ENTER</kbd> 播放 <kbd>/</kbd> 检索 <kbd>ESC</kbd> 返回</p></div><div class="settings-bottom"><button data-action="restart">REINITIALIZE SYSTEM <span>↻</span></button></div><div class="modal-bottom"><span>RHINE MUSIC LIB / 1.0 · 使用 MiSans 字体（小米） <a href="${assetUrl("fonts/MiSans-license.pdf")}" target="_blank" rel="noopener">字体许可</a></span><span>POWERED BY RHINE LAB</span></div>`;
}

document.addEventListener("submit", async event => {
  const form = event.target as HTMLFormElement;
  if (form.id !== "music-library-form") return;
  event.preventDefault();
  const input = form.elements.namedItem("directory") as HTMLInputElement;
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  button.disabled = true;
  try {
    await loadMusicLibrary(input.value);
    player.audio.pause();
    location.reload();
  } catch (error) {
    notify(error instanceof Error ? error.message : "目录载入失败");
    button.disabled = false;
  }
});

document.addEventListener("input", (e) => {
  const slider = e.target as HTMLInputElement;
  if (slider.dataset.quality) {
    const output = document.querySelector<HTMLOutputElement>(`[data-quality-output="${slider.dataset.quality}"]`);
    if (output) output.value = `${slider.value}%`;
  }
  const volume = e.target as HTMLInputElement;
  if (volume.dataset.volume === "musicVolume" || volume.dataset.volume === "soundVolume") {
    prefs[volume.dataset.volume] = Number(volume.value) / 100;
    volume.closest("label")?.querySelector("output")?.replaceChildren(`${volume.value}%`);
    saveAudioPrefs();
  }
  if ((e.target as HTMLElement).id === "archive-search") {
    searchQuery = (e.target as HTMLInputElement).value;
    renderResults();
  }
});
document.addEventListener("change", (e) => {
  const el = e.target as HTMLInputElement;
  if (el.id === "quality-preset" && Object.hasOwn(qualityPresets, el.value)) {
    prefs.rendering = { ...qualityPresets[el.value as QualityPreset] };
    savePrefs();
  } else if (el.dataset.quality) {
    const key = el.dataset.quality as keyof RenderQuality;
    prefs.rendering = normalizeQuality({ ...prefs.rendering, [key]: key === "antialias" ? el.value : Number(el.value) });
    savePrefs();
  }
  if (el.dataset.pref) {
    const key = el.dataset.pref;
    if (key === "sound" || key === "music" || key === "quality" || key === "superPerformance") prefs[key] = el.checked;
    if (key === "sound" || key === "music") saveAudioPrefs(); else savePrefs();
    audio.play("confirm");
  }
  if (el.dataset.motion) {
    const key = el.dataset.motion as MotionKey;
    prefs.motion[key] = el.checked;
    prefs.motionPreset = motionPresetFor(prefs.motion);
    savePrefs();
    const motionRoot = $("#motion-settings");
    const advancedOpen = motionRoot.querySelector<HTMLDetailsElement>(".motion-advanced")?.open ?? false;
    const settingsPanel = motionRoot.closest<HTMLElement>(".settings-modal");
    const scrollTop = settingsPanel?.scrollTop ?? 0;
    motionRoot.outerHTML = motionSettingsMarkup(prefs.motion, prefs.motionPreset);
    $("#motion-preference-note").outerHTML = motionPreferenceNoteMarkup();
    $("#motion-settings").querySelector<HTMLDetailsElement>(".motion-advanced")!.open = advancedOpen;
    requestAnimationFrame(() => {
      if (settingsPanel) settingsPanel.scrollTop = scrollTop;
      document.querySelector<HTMLInputElement>(`[data-motion="${key}"]`)?.focus({ preventScroll: true });
    });
    notify(key === "boot" ? "开场设置将在下次重播时生效" : el.checked ? "已启用此动画" : "已关闭此动画");
    audio.play("confirm");
  }
});
document.addEventListener("click", (e) => {
  const themeButton = (e.target as Element).closest<HTMLElement>("[data-color-theme]");
  if (themeButton) { prefs.colorTheme = themeButton.dataset.colorTheme === "dark" ? "dark" : "light"; savePrefs(); return; }
  if (!started) return;
  if (modalClosing) return;
  const el = (e.target as Element).closest<HTMLElement>("button");
  if (!el) return;
  if (el.dataset.action === "theme-toggle") { prefs.colorTheme = prefs.colorTheme === "dark" ? "light" : "dark"; savePrefs(); return; }
  if (el.dataset.grouping && mode === "archive" && !modal) {
    setMusicGrouping(el.dataset.grouping as MusicGrouping);
    columnMemory.splice(0, columnMemory.length, ...archiveColumns.map((_, lane) => columnFiles(lane)[0]));
    filter = "全部歌曲";
    syncCollectionControls();
    if (records.length) { columnMemory[fileLocation(selected).lane] = selected; scene?.select(selected); updateSelection(); }
    return;
  }
  if (el.dataset.albumTrack !== undefined) { void player.play(Number(el.dataset.albumTrack)); return; }
  if (el.dataset.tab) { setTab(el.dataset.tab); return; }
  if (el.dataset.action === "motion-preset") {
    const preset = el.dataset.preset;
    if (preset !== "full" && preset !== "reduced") return;
    prefs.motionPreset = preset;
    prefs.motion = preset === "full" ? fullMotion() : reducedMotion();
    savePrefs();
    renderModal();
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-action="motion-preset"][data-preset="${prefs.motionPreset}"]`)?.focus({ preventScroll: true }));
    audio.play("confirm");
    return;
  }
  if (el.dataset.select) {
    select(Number(el.dataset.select));
    return;
  }
  if (el.dataset.result) {
    const index = Number(el.dataset.result);
    closeModal(() => {
      select(index);
      openFile();
    });
    return;
  }
  if (el.dataset.filter) {
    filter = el.dataset.filter;
    document
      .querySelectorAll("[data-filter]")
      .forEach((b) =>
        b.classList.toggle(
          "active",
          (b as HTMLElement).dataset.filter === filter,
        ),
      );
    renderResults();
    return;
  }
  if (el.dataset.tab) {
    setTab(el.dataset.tab);
    return;
  }
  const action = el.dataset.action;
  if (action === "choose-music") { void chooseMusicDirectory(); return; }
  if (action === "toggle-three") { void toggleThree(); return; }
  if (action === "sound-preview") audio.play("confirm");
  if (action === "skip") {
    setMode("archive");
    audio.play("confirm");
  }
  if (action === "prev") stepFile(-1);
  if (action === "next") stepFile(1);
  if (action === "column-prev") stepColumn(-1);
  if (action === "column-next") stepColumn(1);
  if (action === "open") openFile();
  if (action === "model-viewer" && mode === "detail" && scene) {
    const activeScene = scene;
    // Safari does not always focus a button when it is tapped. Capture the
    // actual opener so closing the modal reliably restores the right control.
    el.focus({ preventScroll: true });
    viewer ??= new ModelViewer($("#stage"), () => { audio.setScene(mode); audio.play("page-close"); }, (sound) => audio.play(sound === "tick" ? "ui-tick" : sound));
    audio.setScene("viewer");
    viewer.setSuperPerformance(superPerformanceEnabled());
    viewer.setQuality(effectiveRenderQuality());
    viewer.setMotion(prefs.motion);
    scene.finishDecryption();
    viewer.open(
      records[selected].id,
      records[selected].title,
      () => activeScene.createAssemblyModel(),
      !motionActive("viewerNavigation"),
    );
    audio.play("page-open");
  }
  if (action === "back") {
    setMode("archive");
    audio.play("back");
  }
  if (action === "search" || action === "saved" || action === "settings") {
    el.focus({ preventScroll: true });
    openModal(action);
  }
  if (action === "close-modal") closeModal();
  if (action === "bookmark") toggleSaved();
  if (action === "reset-search") {
    modal = "search";
    searchQuery = "";
    filter = "全部歌曲";
    renderModal();
  }
  if (action === "replay" || action === "restart") {
    replayBoot();
  }
  if (action === "enable-motion") {
    prefs.motion = fullMotion();
    prefs.motionPreset = "full";
    savePrefs();
    replayBoot();
  }
  if (action === "fullscreen" && document.fullscreenEnabled) {
    if (document.fullscreenElement) void document.exitFullscreen();
    else
      void document.documentElement
        .requestFullscreen()
        .catch(() => notify("请使用浏览器的全屏快捷键 F11"));
  }
});
document.addEventListener("keydown", (e) => {
  if (!started) return;
  if (viewer?.isOpen) return;
  if (playground?.active && !modal) {
    if (e.key === "Escape") { e.preventDefault(); playground.stop(); }
    else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", "/"].includes(e.key) && !(e.target instanceof HTMLButtonElement)) e.preventDefault();
    return;
  }
  if (modalClosing) {
    e.preventDefault();
    return;
  }
  const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
  if (e.key === "Escape") {
    if (modal) closeModal();
    else if (mode === "detail" || (mode === "boot" && ready)) { const sound = mode === "detail" ? "back" : "ui-tick"; setMode("archive"); audio.play(sound); }
    return;
  }
  if (modal && e.key === "Tab") {
    const focusables = [
      ...$("#modal-root").querySelectorAll<HTMLElement>(
        'button,input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]',
      ),
    ];
    const visible = focusables.filter(el => el.getClientRects().length > 0);
    const first = visible[0],
      last = visible.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
    return;
  }
  if (typing || modal || !ready) return;
  if (
    (e.target as HTMLElement).dataset.tab &&
    ["ArrowLeft", "ArrowRight"].includes(e.key)
  ) {
    e.preventDefault();
    const tabs = ["overview", "notes", "history"];
    setTab(
      tabs[(tabs.indexOf(activeTab) + (e.key === "ArrowRight" ? 1 : 2)) % 3],
    );
    $<HTMLButtonElement>(`[data-tab="${activeTab}"]`).focus();
    return;
  }
  if (e.key === "/") {
    e.preventDefault();
    if (mode === "boot") setMode("archive");
    openModal("search");
  }
  if (e.key === "ArrowLeft" && mode !== "boot") {
    e.preventDefault();
    stepColumn(-1);
  }
  if (e.key === "ArrowRight" && mode !== "boot") {
    e.preventDefault();
    stepColumn(1);
  }
  if (["ArrowUp", "ArrowDown"].includes(e.key) && mode !== "boot") {
    e.preventDefault();
    stepFile(e.key === "ArrowUp" ? -1 : 1);
  }
  if (
    e.key === "Enter" &&
    (document.activeElement === document.body ||
      document.activeElement?.id === "detail-content" ||
      ["prev", "next", "column-prev", "column-next"].includes(
        (document.activeElement as HTMLElement)?.dataset.action ?? "",
      ) ||
      (document.activeElement as HTMLElement)?.dataset.select)
  ) {
    e.preventDefault();
    if (mode === "boot") setMode("archive");
    else if (mode === "archive") openFile();
  }
});

const ease = (t: number) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
function bootFrame(t: number) {
  if (isWallpaper && !scene && frozenTime === null && t >= 21.9) {
    setMode("archive");
    return undefined;
  }
  if (frozenTime === null && t >= ARRAY_OPENING_END && (!isWallpaper ||
      !openingShowsDetail(wallpaperHost()?.properties.openingdetail?.value, !!workbench?.enabled))) {
    setMode("archive");
    return undefined;
  }
  audio.updateBoot(t, frozenTime !== null);
  const motion = bootSequence.update(t);
  if (workbench?.enabled && frozenTime === null) {
    const end = openingShowsDetail(wallpaperHost()?.properties.openingdetail?.value, true) ? 35 : ARRAY_OPENING_END;
    if (t > end - .35) $(".powered").style.opacity = String(1 - ease((t - end + .35) / .35));
  }
  let step: string = motion.step;
  if (t >= 22) {
    step = "array";
  }
  if (t >= 25.68) {
    step = "select";
  }
  if (t >= 28.3) {
    step = "inspect";
  }
  if (step !== lastStep) {
    $("#stage").dataset.boot = step;
    lastStep = step;
  }
  $(".file-title").firstChild!.textContent =
    step === "array"
      ? "SELECTING FILES...".slice(0, Math.max(0, Math.floor((t - 21.94) * 18)))
      : "FILE NUMBER: ";
  $("#stage").style.setProperty(
    "--entry-opacity",
    String(ease((t - 21.9) / 0.13)),
  );
  $(".callout-rule").style.transform = `scaleX(${ease((t - 22.08) / 0.9)})`;
  const reveal = ease((t - 22) / 0.4),
    lift = ease((t - 26) / 1.8),
    zoom = 0.55 * ease((t - 27.3) / 1.65) + 0.45 * ease((t - 29.0) / 5.0);
  if (t >= 35) {
    setMode("detail");
    return undefined;
  }
  return { reveal, lift, zoom, time: t };
}

const inspectionOverlay = new InspectionOverlay();
const documentDecryption = new DocumentDecryption();
// A newly opened archive can introduce another font shard. Re-measure its
// redaction lines after font swap while retaining the current reveal progress.
document.fonts.addEventListener("loadingdone", () => documentDecryption.refresh());

let lastTime = 0,
  frameCount = 0,
  frameStart = performance.now(),
  fps = 0;
function frame(ms: number) {
  if (!wallpaperFrame(ms)) { requestAnimationFrame(frame); return; }
  if (document.hidden) { requestAnimationFrame(frame); return; }
  workbench?.tick();
  const time = ms / 1000;
  const theme = scene?.themeAmount ?? (prefs.colorTheme === "dark" ? 1 : 0);
  paintTheme(theme);
  viewer?.setTheme(theme);
  playground?.tick(time);
  const cinema =
    mode === "boot" && ready
      ? bootFrame(frozenTime ?? time - bootStart)
      : undefined;
  wallpaperEffects?.update(time, motionIsReduced(), motionActive("pointerParallax"));
  // The calibrated 2D opening fully covers the scene until array entry.
  scene?.setPlayback(player.currentIndex, player.playing);
  viewer?.setPlayback(player.playing && player.currentIndex === selected);
  if (!viewer?.isOpen && (!modal || modalClosing) && (!cinema || cinema.time >= 21.9)) scene?.update(time, cinema);
  viewer?.update(time);
  if (threeState === "closing" && scene?.presentationHidden) releaseThree();
  playground?.position();
  if (scene && mode === "detail") {
    documentDecryption.update(time, scene.decryptionFrame, !motionActive("documentReveal"));
    $("#detail-content").style.opacity = String(scene.detailVisibility);
    $("#detail-content").style.translate =
      `0 ${(1 - scene.detailVisibility) * 18}px`;
    $("#detail-content").inert = scene.detailVisibility < 0.1;
    if (pendingDetailFocus && scene.detailVisibility >= 0.1 && !modal && !viewer?.isOpen) {
      $("#detail-content").focus({ preventScroll: true });
      pendingDetailFocus = false;
    }
  }
  $("#stage").style.setProperty("--detail-shade", String(mode === "boot" ? 0 : scene?.detailVisibility ?? 0));
  const currentScene = scene;
  if (currentScene) inspectionOverlay.render(currentScene.decryptionFrame,
    (x, y) => currentScene.projectCard(x, y), Boolean(cinema), motionActive("modelDecryption"));
  if (Math.floor(time) !== lastTime) {
    lastTime = Math.floor(time);
    updateFooterClock(new Date(), motionActive("rollingNumbers"));
  }
  frameCount++;
  if (ms - frameStart > 1000) {
    fps = (frameCount * 1000) / (ms - frameStart);
    frameStart = ms;
    frameCount = 0;
    $("#three-scene").dataset.fps = String(Math.round(fps));
    $("#three-scene").dataset.renderStats = JSON.stringify(scene?.getStats() ?? { loaded: false, drawCalls: 0, triangles: 0 });
  }
  requestAnimationFrame(frame);
}
function bindScene(scene: ArchiveScene, cell?: { lane: number; row: number }) {
    scene.select(selected, cell ? { cell } : undefined);
    scene.onSelect = (i, cell) => {
      if (mode !== "archive" || modal || viewer?.isOpen) return;
      select(i, cell ? { cell } : undefined);
    };
    scene.onNavigate = (axis, direction) => {
      if (mode !== "archive" || modal || viewer?.isOpen) return;
      if (axis === "lane") stepColumn(direction);
      else stepFile(direction);
    };
    scene.onHover = (i) => {
      const label = $("#hover-label");
      if (i === null) {
        label.hidden = true;
        hoverCode.finish();
        hoverTitle.finish();
        return;
      }
      const animated = motionActive("rollingText") && mode === "archive";
      const numbersAnimated = motionActive("rollingNumbers") && mode === "archive";
      hoverCode.update({
        value: Number(records[i].id.slice(2)),
        animated: !label.hidden && numbersAnimated,
      });
      hoverTitle.update({ text: records[i].title, animated: !label.hidden && animated });
      label.hidden = false;
      // Prepare the first visible value so the next hover can animate immediately.
      hoverCode.update({ animated: numbersAnimated });
      hoverTitle.update({ animated });
    };
}
function syncThreeButton() {
  $("#stage").dataset.threeState = threeState;
  syncWallpaperBackground();
  const button = document.querySelector<HTMLButtonElement>('[data-action="toggle-three"]');
  if (!button) return;
  button.textContent = threeState === "loading" ? "3D 载入中…" : threeState === "closing" ? "3D 关闭中…" : threeState === "off" ? "3D 关闭" : "3D 开启";
  button.disabled = threeState === "loading";
  button.setAttribute("aria-pressed", String(threeState === "on"));
  button.title = threeState === "off" ? "重新载入三维模型" : threeState === "closing" ? "取消关闭，恢复三维画面" : "卸载三维模型，保留 2D 界面";
}
function releaseThree() {
  if (!scene) return;
  resumeCell = { ...scene.getStats().selectedCell }; resumeSelection = selected;
  viewer?.dispose(); viewer = undefined;
  scene.dispose(); scene = undefined;
  if (mode === "detail") {
    $("#detail-content").style.opacity = "1";
    $("#detail-content").style.translate = "0 0";
    $("#detail-content").inert = false;
    documentDecryption.reset($("#detail-content"), true);
  }
  threeState = "off"; syncThreeButton();
  $("#hover-label").hidden = true;
  delete $("#three-scene").dataset.renderQuality;
  updateQualitySummary();
}
async function toggleThree() {
  if (!isWallpaper || !ready || threeState === "loading") return;
  if (threeState === "closing") {
    scene?.setPresentationVisible(true, !motionActive("surfaceTransitions"));
    threeState = "on"; syncThreeButton(); return;
  }
  if (scene) {
    playground?.stop();
    threeState = "closing"; syncThreeButton();
    scene.setPresentationVisible(false, !motionActive("surfaceTransitions"));
    if (!motionActive("surfaceTransitions")) releaseThree();
    return;
  }
  threeState = "loading"; syncThreeButton();
  let next: ArchiveScene | undefined;
  try {
    next = new ArchiveScene($("#three-scene"));
    next.renderer.domElement.style.opacity = "0";
    next.setPresentationVisible(false, true);
    await next.load();
    next.setMode(mode === "detail" ? "detail" : "archive");
    bindScene(next, resumeSelection === selected ? resumeCell : undefined);
    next.revealImmediately();
    scene = next;
    scene.setTheme(prefs.colorTheme === "dark", true);
    scene.setArchiveCoverage(wallpaperHost()?.properties.archivecoverage?.value === "extra");
    savePrefs();
    scene.setPresentationVisible(true, !motionActive("surfaceTransitions"));
    threeState = "on"; syncThreeButton();
  } catch (error) {
    next?.dispose(); scene = undefined;
    threeState = "off"; syncThreeButton();
    notify("三维模型载入失败，请点击 3D 关闭重试。");
    console.error(error);
  }
}

async function start() {
  try {
    if (isWallpaper) await window.rhineWallpaperPropertiesReady;
    if (records.length && (!isWallpaper || wallpaperHost()?.properties.load3donstartup?.value !== false)) {
      scene = new ArchiveScene($("#three-scene"));
      scene.setTheme(prefs.colorTheme === "dark", true);
      scene.setArchiveCoverage(wallpaperHost()?.properties.archivecoverage?.value === "extra");
    } else {
      threeState = "off";
      syncThreeButton();
    }
    await Promise.all([
      scene?.load(),
      loadBootWebfonts(),
      // With unicode-range faces, preload the opening's actual characters,
      // not every font shard. Other archive text loads on demand.
      document.fonts.load("300 20px MiSans", "ACCESS WELCOME TO AUDIO COLLECTION"),
      document.fonts.load("400 20px MiSans", "身份信息确认请求已接收开始处理权限验证通过欢迎访问莱茵生命内部资料档案编号保密级别商业区选择档案：0123456789 JOYCE MOORE"),
      document.fonts.load("600 20px MiSans", "SYNTHESIZE INFORMATION ANALYSIS OS"),
      document.fonts.load("700 20px MiSans", "RHINE LAB WELCOME TO AUDIO COLLECTION"),
    ]);
    if (scene) bindScene(scene);
    savePrefs();
    ready = true;
    if (records.length) select(playbackOrder()[0]);
    if (entry) entry.ready();
    else {
      if (isWallpaper) {
        // CEF allows automatic audio; never block the visual on audio policy or decoding.
        await Promise.race([audio.unlock(), new Promise(resolve => setTimeout(resolve, 3000))]);
      }
      completeStartup(false);
    }
  } catch (error) {
    console.error(error);
    $("#loading").innerHTML =
      '<div class="error-state"><strong>CONNECTION INTERRUPTED</strong><p>三维档案资源未能载入。请确认浏览器已启用硬件加速，然后重新连接。</p><button onclick="location.reload()">RECONNECT →</button></div>';
  }
}
function completeStartup(silent: boolean) {
  if (started || !ready) return;
  started = true;
  if (silent) {
    prefs.sound = false;
    prefs.music = false;
    saveAudioPrefs();
  }
  audio.releaseEntry();
  audio.restartBoot();
  const fade = motionActive("boot") ? 600 : 0;
  bootStart = performance.now() / 1000 - (reviewParams.has("time") ? Number(reviewParams.get("time")) : 1.76);
  if (!reviewParams.has("time")) bootStart += fade / 1000;
  setMode("boot");
  if (reviewParams.get("scene") === "archive" || (!motionActive("boot") && !reviewParams.has("time"))) setMode("archive");
  if (reviewParams.get("scene") === "detail") setMode("detail");
  if (isWallpaper && wallpaperHost()?.properties.boot?.value === false) setMode("archive");
  $("#stage").inert = false;
  $(".mobile-entry").inert = false;
  loading.classList.add("loaded");
  loading.inert = true;
  setTimeout(() => {
    const restoreFocus = loading.contains(document.activeElement) || document.activeElement === document.body;
    loading.remove();
    if (entry && restoreFocus) {
      const skip = $("#skip");
      const target = mode === "boot" ? skip.getClientRects().length ? skip : $(".mobile-entry") : $(".read-file");
      target.focus({ preventScroll: true });
    }
  }, fade);
  requestAnimationFrame(frame);
  // Do not compete with entry audio/font downloads. Full offline installation
  // begins after startup is complete and remains atomic.
  setTimeout(() => void initPwa(notify), 1500);
}
updateSelection();
const customBackground = isWallpaper ? new WallpaperBackground($("#stage"), notify) : undefined;
function syncWallpaperBackground(retry = false) {
  customBackground?.update(wallpaperHost()?.properties ?? {}, mode !== "boot" && (threeState === "off" || threeState === "loading"), !motionActive("surfaceTransitions"), retry);
}
if (isWallpaper) {
  const apply = (properties: WallpaperProperties) => {
    const theme = properties.colortheme?.value;
    if (theme === "light" || theme === "dark") prefs.colorTheme = theme;
    scene?.setArchiveCoverage(properties.archivecoverage?.value === "extra" || wallpaperHost()?.properties.archivecoverage?.value === "extra");
    for (const key of ["sound", "music"] as const)
      if (typeof properties[key]?.value === "boolean") prefs[key] = properties[key].value as boolean;
    if (typeof properties.reduced?.value === "boolean") {
      prefs.motion = properties.reduced.value ? reducedMotion() : fullMotion();
      prefs.motionPreset = motionPresetFor(prefs.motion);
    }
    for (const key of ["soundVolume", "musicVolume"] as const) {
      const value = properties[key.toLowerCase()]?.value;
      if (typeof value === "number" && Number.isFinite(value)) prefs[key] = Math.max(0, Math.min(1, value / 100));
    }
    const qualityProperties = { ...wallpaperHost()?.properties, ...properties };
    if (Object.keys(properties).some(key => key === "renderquality" || key.startsWith("quality")))
      prefs.rendering = wallpaperQuality(qualityProperties, prefs.rendering);
    savePrefs();
    if (properties.customwallpaperfile || properties.customwallpaper?.value === true) syncWallpaperBackground(true);
    if (properties.boot?.value === false && started && mode === "boot") setMode("archive");
    // Keep an already-open settings surface in sync without replacing focused controls.
    document.querySelectorAll<HTMLInputElement>("[data-pref]").forEach(input => {
      const key = input.dataset.pref as "sound" | "music" | "quality" | "superPerformance";
      if (key in prefs) input.checked = prefs[key];
    });
    document.querySelectorAll<HTMLInputElement>("[data-motion]").forEach(input => {
      input.checked = prefs.motion[input.dataset.motion as MotionKey];
    });
    document.querySelectorAll<HTMLElement>('[data-action="motion-preset"]').forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.preset === prefs.motionPreset));
    });
    const note = document.querySelector("#motion-preference-note");
    if (note) note.outerHTML = motionPreferenceNoteMarkup();
    for (const key of ["soundVolume", "musicVolume"] as const) {
      const input = document.querySelector<HTMLInputElement>(`[data-volume="${key}"]`);
      if (input) { input.value = String(Math.round(prefs[key] * 100)); input.closest("label")?.querySelector("output")?.replaceChildren(`${input.value}%`); }
    }
  };
  window.addEventListener("rhine-wallpaper-properties", event => apply((event as CustomEvent<WallpaperProperties>).detail));
  let pausedAt: number | undefined;
  const pause = () => {
    const paused = wallpaperHost()?.paused ?? false;
    if (paused && pausedAt === undefined) pausedAt = performance.now();
    if (!paused && pausedAt !== undefined) {
      if (started && mode === "boot") bootStart += (performance.now() - pausedAt) / 1000;
      pausedAt = undefined;
    }
    audio.setHostPaused(paused);
  };
  window.addEventListener("rhine-wallpaper-pause", pause);
  apply(wallpaperHost()?.properties ?? {});
  pause();
}
if (isWallpaper) {
  workbench = new Workbench($("#stage"), () => {
    if (ready && mode !== "boot") setMode("archive");
  }, lane => {
    if (ready && !modal) select(columnMemory[lane]);
  });
  workbench.setMotion(prefs.motion);
  playground = new ArchivePlayground($("#stage"), () => scene,
    () => ({ enabled: !!workbench?.enabled && mode === "archive" && ready, paused: Boolean(modal) || modalClosing || Boolean(wallpaperHost()?.paused) || document.hidden, reduced: motionIsReduced() }),
    value => { musicSuppressed = value; configureAudio(); }, () => audio.play("tick"));
  wallpaperEffects = new WallpaperEffects($("#stage"), () => scene);
  document.addEventListener("click", event => {
    const button = (event.target as Element).closest<HTMLElement>("[data-workbench-mode]");
    if (button) closeModal(() => { workbench!.setEnabled(button.dataset.workbenchMode === "workbench"); });
  });
}
void (async () => {
  if (!musicDirectory && !reviewEntry) await chooseMusicDirectory();
  await start();
})();
// Deterministic review controls: the running application, never a video surrogate.
Object.assign(window, {
  rhine: {
    // The review button supplies a real user activation. Preferences stay local to this preview.
    playBootPreview: async (music = false) => {
      if (!ready || !navigator.userActivation.isActive) return false;
      const request = ++audioPreviewRequest;
      audioPreview = true;
      audio.configure({ ...prefs, sound: true, music });
      const unlocked = await audio.unlock();
      if (request !== audioPreviewRequest) return false;
      if (!unlocked) {
        audioPreview = false;
        configureAudio();
        return false;
      }
      replayBoot(true);
      return true;
    },
    seek: (t: number) => {
      setMode("boot");
      bootStart = performance.now() / 1000 - t;
      lastStep = "";
    },
    archive: () => setMode("archive"),
    detail: () => openFile(),
    select: (i: number) => select(i),
    stats: () => ({
      ...scene?.getStats(),
      threeState,
      fps: Math.round(fps),
      mode,
      ready,
      startup: started ? "started" : entry?.phase ?? "loading",
      motion: { reduced: motionIsReduced(), preset: prefs.motionPreset },
      bootTime: mode === "boot" ? started ? (frozenTime ?? performance.now() / 1000 - bootStart) + 5 : 6.76 : null,
      selected: records[selected]?.id ?? null,
      saved: [...saved],
      audio: audio.stats(),
      wallpaper: isWallpaper ? wallpaperHost() : null,
    }),
  },
});
if (import.meta.hot) import.meta.hot.dispose(() => audio.dispose());
