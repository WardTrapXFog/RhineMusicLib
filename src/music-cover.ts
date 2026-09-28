import * as THREE from "three";
import { records, songCoverUrl } from "./data";

export function createCoverAtlas() {
  const canvas = document.createElement("canvas");
  const columns = Math.max(1, Math.ceil(Math.sqrt(records.length)));
  const rows = Math.max(1, Math.ceil(records.length / columns));
  const tile = Math.max(1, Math.min(256, Math.floor(4096 / Math.max(columns, rows))));
  canvas.width = columns * tile;
  canvas.height = rows * tile;
  const context = canvas.getContext("2d")!;
  const finishTile = (x: number, y: number) => {
    context.beginPath();
    context.arc(x + tile / 2, y + tile / 2, tile * .355, 0, Math.PI * 2);
    context.lineWidth = Math.max(1, tile * .008);
    context.strokeStyle = "#eee9df88";
    context.stroke();
    context.beginPath();
    context.arc(x + tile / 2, y + tile / 2, tile * .051, 0, Math.PI * 2);
    context.fillStyle = "#2b2b27aa";
    context.fill();
    context.lineWidth = Math.max(1, tile * .023);
    context.strokeStyle = "#dfd7caaf";
    context.stroke();
  };
  records.forEach((record, index) => {
    const x = (index % columns) * tile;
    const y = Math.floor(index / columns) * tile;
    context.fillStyle = "#292b27";
    context.fillRect(x, y, tile, tile);
    context.fillStyle = "#e9dfcf";
    context.font = `bold ${Math.max(5, Math.round(tile * .086))}px MiSans`;
    context.fillText("RHINE", x + tile * .086, y + tile * .312);
    context.fillText("MUSIC LIB", x + tile * .086, y + tile * .434);
    context.fillStyle = "#db8324";
    context.fillRect(x + tile * .086, y + tile * .734, tile * .312, Math.max(1, tile * .016));
    if (!record.song?.hasCover) { finishTile(x, y); return; }
    const image = new Image();
    image.onload = () => {
      context.drawImage(image, x, y, tile, tile);
      finishTile(x, y);
      texture.needsUpdate = true;
    };
    image.src = songCoverUrl(record.song.id);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return { texture, rows, columns };
}

export function coverGeometry(index: number, columns: number, rows: number) {
  const geometry = new THREE.CircleGeometry(1.26, 64);
  geometry.translate(0, 1.45, 0.31);
  setCoverUv(geometry, index, columns, rows);
  return geometry;
}

export function setCoverUv(geometry: THREE.BufferGeometry, index: number, columns: number, rows: number) {
  const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
  const base = (geometry.userData.baseCoverUv ??= Array.from({ length: uv.count }, (_, i) => [uv.getX(i), uv.getY(i)])) as number[][];
  const column = index % columns;
  const row = Math.floor(index / columns);
  for (let i = 0; i < uv.count; i++) {
    const [u, v] = base[i];
    uv.setXY(i, (column + u) / columns, (rows - 1 - row + v) / rows);
  }
  uv.needsUpdate = true;
}

export function createGalleryLabelAtlas() {
  const canvas = document.createElement("canvas");
  const columns = Math.max(1, Math.ceil(Math.sqrt(records.length)));
  const rows = Math.max(1, Math.ceil(records.length / columns));
  const width = Math.min(512, Math.floor(4096 / columns));
  const height = Math.floor(width / 2);
  canvas.width = columns * width;
  canvas.height = rows * height;
  const context = canvas.getContext("2d")!;
  const fit = (value: string, maxWidth: number, initial: number) => {
    let size = initial;
    do { context.font = `600 ${size}px MiSans, sans-serif`; size -= 2; }
    while (context.measureText(value).width > maxWidth && size > 18);
  };
  records.forEach((record, index) => {
    const x = (index % columns) * width;
    const y = Math.floor(index / columns) * height;
    context.fillStyle = "#e7e3da";
    context.fillRect(x, y, width, height);
    context.fillStyle = "#222720";
    context.fillRect(x + 25, y + 28, 5, height - 56);
    context.font = "600 18px MiSans, sans-serif";
    context.fillText("RHINE MUSIC LIB  /  AUDIO COLLECTION", x + 48, y + 49, width - 72);
    context.fillStyle = "#c67328";
    context.fillRect(x + 48, y + 69, width - 76, 2);
    context.fillStyle = "#1e241e";
    fit(record.title, width - 100, 44);
    context.fillText(record.title, x + 48, y + 139, width - 100);
    context.fillStyle = "#55594f";
    context.font = "400 27px MiSans, sans-serif";
    context.fillText(record.department, x + 48, y + 194, width - 100);
    context.font = "600 16px MiSans, sans-serif";
    context.fillText(`NO. ${String(index + 1).padStart(3, "0")}`, x + 48, y + height - 22);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return { texture, columns, rows };
}

export function createSpineLabelAtlas() {
  const canvas = document.createElement("canvas");
  const columns = Math.max(1, Math.ceil(Math.sqrt(records.length)));
  const rows = Math.max(1, Math.ceil(records.length / columns));
  const width = Math.min(512, Math.floor(4096 / columns));
  const height = 48;
  canvas.width = columns * width;
  canvas.height = rows * height;
  const context = canvas.getContext("2d")!;
  records.forEach((record, index) => {
    const x = (index % columns) * width;
    const y = Math.floor(index / columns) * height;
    context.fillStyle = "#deded3";
    context.fillRect(x, y, width, height);
    context.fillStyle = "#c87931";
    context.fillRect(x + 8, y + 7, 5, height - 14);
    context.fillStyle = "#202721";
    context.font = "600 27px MiSans, sans-serif";
    context.textBaseline = "middle";
    context.fillText(`${record.title}  /  ${record.department}`, x + 25, y + height / 2, width - 36);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return { texture, columns, rows };
}

export function galleryCoverMaterial(texture: THREE.Texture, columns: number, rows: number) {
  const material = new THREE.MeshPhysicalMaterial({ map: texture, roughness: .5, metalness: 0, toneMapped: false, side: THREE.DoubleSide });
  material.onBeforeCompile = shader => {
    shader.vertexShader = `attribute float coverIndex; varying vec2 vCoverUv;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>\nvCoverUv = (uv + vec2(mod(coverIndex, ${columns.toFixed(1)}), ${rows.toFixed(1)} - 1.0 - floor(coverIndex / ${columns.toFixed(1)}))) / vec2(${columns.toFixed(1)}, ${rows.toFixed(1)});`);
    shader.fragmentShader = `varying vec2 vCoverUv;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", "diffuseColor *= texture2D(map, vCoverUv);");
  };
  material.customProgramCacheKey = () => `music-cover-atlas-${columns}-${rows}`;
  return material;
}
