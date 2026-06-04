const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const dom = {
  fileInput: document.getElementById("fileInput"),
  projectFileInput: document.getElementById("projectFileInput"),
  newCanvasButton: document.getElementById("newCanvasButton"),
  openProjectButton: document.getElementById("openProjectButton"),
  saveProjectButton: document.getElementById("saveProjectButton"),
  addImageButton: document.getElementById("addImageButton"),
  undoButton: document.getElementById("undoButton"),
  redoButton: document.getElementById("redoButton"),
  addTextButton: document.getElementById("addTextButton"),
  addRectButton: document.getElementById("addRectButton"),
  addEllipseButton: document.getElementById("addEllipseButton"),
  applyCanvasSize: document.getElementById("applyCanvasSize"),
  fitViewButton: document.getElementById("fitViewButton"),
  canvasWidth: document.getElementById("canvasWidth"),
  canvasHeight: document.getElementById("canvasHeight"),
  brushColor: document.getElementById("brushColor"),
  brushSize: document.getElementById("brushSize"),
  dropZone: document.getElementById("dropZone"),
  cropActions: document.getElementById("cropActions"),
  applyCropButton: document.getElementById("applyCropButton"),
  cancelCropButton: document.getElementById("cancelCropButton"),
  sidePanel: document.getElementById("sidePanel"),
  mobileSheetScrim: document.getElementById("mobileSheetScrim"),
  mobilePanelButtons: Array.from(document.querySelectorAll("[data-mobile-panel]")),
  layerList: document.getElementById("layerList"),
  duplicateLayerButton: document.getElementById("duplicateLayerButton"),
  deleteLayerButton: document.getElementById("deleteLayerButton"),
  propertiesForm: document.getElementById("propertiesForm"),
  layerName: document.getElementById("layerName"),
  layerX: document.getElementById("layerX"),
  layerY: document.getElementById("layerY"),
  layerWidth: document.getElementById("layerWidth"),
  layerHeight: document.getElementById("layerHeight"),
  aspectLockLabel: document.getElementById("aspectLockLabel"),
  aspectLock: document.getElementById("aspectLock"),
  layerRotation: document.getElementById("layerRotation"),
  layerOpacity: document.getElementById("layerOpacity"),
  blendMode: document.getElementById("blendMode"),
  flipXButton: document.getElementById("flipXButton"),
  flipYButton: document.getElementById("flipYButton"),
  appearanceGroup: document.getElementById("appearanceGroup"),
  fillColor: document.getElementById("fillColor"),
  textContentLabel: document.getElementById("textContentLabel"),
  textContent: document.getElementById("textContent"),
  fontSizeLabel: document.getElementById("fontSizeLabel"),
  fontSize: document.getElementById("fontSize"),
  textOutlineGroup: document.getElementById("textOutlineGroup"),
  textOutlineEnabled: document.getElementById("textOutlineEnabled"),
  textOutlineColor: document.getElementById("textOutlineColor"),
  textOutlineWidth: document.getElementById("textOutlineWidth"),
  textShadowGroup: document.getElementById("textShadowGroup"),
  textShadowEnabled: document.getElementById("textShadowEnabled"),
  textShadowColor: document.getElementById("textShadowColor"),
  textShadowOpacity: document.getElementById("textShadowOpacity"),
  textShadowBlur: document.getElementById("textShadowBlur"),
  textShadowX: document.getElementById("textShadowX"),
  textShadowY: document.getElementById("textShadowY"),
  brightness: document.getElementById("brightness"),
  contrast: document.getElementById("contrast"),
  saturation: document.getElementById("saturation"),
  blur: document.getElementById("blur"),
  resetFiltersButton: document.getElementById("resetFiltersButton"),
};

const DEFAULT_FILTERS = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
};

const DEFAULT_TEXT_SHADOW = {
  enabled: false,
  color: "#000000",
  opacity: 45,
  blur: 18,
  offsetX: 8,
  offsetY: 10,
};

const DEFAULT_TEXT_OUTLINE = {
  enabled: false,
  color: "#ffffff",
  width: 6,
};

const MAX_PREVIEW_EDGE = 1800;
const MAX_PREVIEW_PIXELS = 2400000;
const HISTORY_LIMIT = 20;
const MOBILE_QUERY = window.matchMedia("(max-width: 760px)");
const PROJECT_MAGIC = "LCANVAS1";
const PROJECT_VERSION = 1;

const state = {
  width: 1280,
  height: 720,
  layers: [],
  activeId: null,
  tool: "select",
  brush: {
    color: "#111827",
    size: 26,
  },
  crop: null,
  interaction: null,
  mobilePanel: "closed",
  history: [],
  future: [],
};

let controlSnapshot = null;
let renderQueued = false;
let propertySyncQueued = false;
let previewScale = 1;
const imageAssetStore = new Map();
const imageAssetIndex = new Map();

function uid() {
  return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function registerImageAsset(src, preferredId = null) {
  if (!src) return null;
  const existingId = imageAssetIndex.get(src);
  if (existingId) return existingId;
  const assetId = preferredId || uid();
  imageAssetStore.set(assetId, src);
  imageAssetIndex.set(src, assetId);
  return assetId;
}

function getImageAsset(assetId) {
  return assetId ? imageAssetStore.get(assetId) || null : null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round(value) {
  return Math.round(value);
}

function degToRad(value) {
  return (value * Math.PI) / 180;
}

function radToDeg(value) {
  return (value * 180) / Math.PI;
}

function copyFilters(filters = DEFAULT_FILTERS) {
  return {
    brightness: Number(filters.brightness ?? 100),
    contrast: Number(filters.contrast ?? 100),
    saturation: Number(filters.saturation ?? 100),
    blur: Number(filters.blur ?? 0),
  };
}

function copyTextShadow(shadow = DEFAULT_TEXT_SHADOW) {
  return {
    enabled: Boolean(shadow.enabled),
    color: shadow.color || DEFAULT_TEXT_SHADOW.color,
    opacity: Number(shadow.opacity ?? DEFAULT_TEXT_SHADOW.opacity),
    blur: Number(shadow.blur ?? DEFAULT_TEXT_SHADOW.blur),
    offsetX: Number(shadow.offsetX ?? DEFAULT_TEXT_SHADOW.offsetX),
    offsetY: Number(shadow.offsetY ?? DEFAULT_TEXT_SHADOW.offsetY),
  };
}

function copyTextOutline(outline = DEFAULT_TEXT_OUTLINE) {
  return {
    enabled: Boolean(outline.enabled),
    color: outline.color || DEFAULT_TEXT_OUTLINE.color,
    width: Number(outline.width ?? DEFAULT_TEXT_OUTLINE.width),
  };
}

function hexToRgba(hex, opacityPercent) {
  const normalized = String(hex || "#000000").replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized.padEnd(6, "0").slice(0, 6);
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${clamp(Number(opacityPercent) / 100, 0, 1)})`;
}

function getLayerAspectRatio(layer) {
  return Number(layer.aspectRatio) || (Number(layer.width) || 1) / Math.max(Number(layer.height) || 1, 1);
}

function activeLayer() {
  return state.layers.find((layer) => layer.id === state.activeId) || null;
}

function topLayer() {
  return state.layers[state.layers.length - 1] || null;
}

function isMobileLayout() {
  return MOBILE_QUERY.matches;
}

function setMobilePanel(panel) {
  const nextPanel = panel === "layers" || panel === "properties" ? panel : "closed";
  state.mobilePanel = nextPanel;

  if (!isMobileLayout()) {
    document.body.classList.remove("mobile-sheet-open");
    document.body.removeAttribute("data-mobile-panel");
    dom.mobileSheetScrim.hidden = true;
    dom.sidePanel.removeAttribute("aria-hidden");
    dom.mobilePanelButtons.forEach((button) => button.classList.remove("is-active"));
    return;
  }

  const isOpen = nextPanel !== "closed";
  document.body.dataset.mobilePanel = nextPanel;
  document.body.classList.toggle("mobile-sheet-open", isOpen);
  dom.mobileSheetScrim.hidden = !isOpen;
  dom.sidePanel.setAttribute("aria-hidden", isOpen ? "false" : "true");
  dom.mobilePanelButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mobilePanel === nextPanel);
  });
}

function syncMobileLayout() {
  setMobilePanel(isMobileLayout() ? state.mobilePanel : "closed");
}

function layerLabel(layer) {
  if (layer.type === "image") return "画像";
  if (layer.type === "shape" && layer.shape === "ellipse") return "円";
  if (layer.type === "shape") return "四角";
  if (layer.type === "text") return "文字";
  if (layer.type === "paint") return "筆";
  return "層";
}

function filtersToCss(filters) {
  const safe = copyFilters(filters);
  return [
    `brightness(${safe.brightness}%)`,
    `contrast(${safe.contrast}%)`,
    `saturate(${safe.saturation}%)`,
    `blur(${safe.blur}px)`,
  ].join(" ");
}

function hasActiveFilters(filters) {
  const safe = copyFilters(filters);
  return (
    safe.brightness !== DEFAULT_FILTERS.brightness ||
    safe.contrast !== DEFAULT_FILTERS.contrast ||
    safe.saturation !== DEFAULT_FILTERS.saturation ||
    safe.blur !== DEFAULT_FILTERS.blur
  );
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function queuePropertiesSync(updateLayerList = false) {
  if (propertySyncQueued) return;
  propertySyncQueued = true;
  requestAnimationFrame(() => {
    propertySyncQueued = false;
    syncProperties(updateLayerList);
  });
}

function getPreviewScale(width, height) {
  const edgeScale = MAX_PREVIEW_EDGE / Math.max(width, height);
  const pixelScale = Math.sqrt(MAX_PREVIEW_PIXELS / Math.max(width * height, 1));
  return Math.min(1, edgeScale, pixelScale);
}

function configurePreviewCanvas() {
  previewScale = getPreviewScale(state.width, state.height);
  canvas.width = Math.max(1, round(state.width * previewScale));
  canvas.height = Math.max(1, round(state.height * previewScale));
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
}

function beginPreviewRender(fast = false) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(previewScale, 0, 0, previewScale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = fast ? "low" : "high";
}

function finishPreviewRender() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function shouldUseFastPreview() {
  return Boolean(state.interaction);
}

function setCanvasSize(width, height, resizePaintLayers = true) {
  const oldWidth = state.width;
  const oldHeight = state.height;
  state.width = clamp(round(width), 64, 8000);
  state.height = clamp(round(height), 64, 8000);
  configurePreviewCanvas();
  dom.canvasWidth.value = state.width;
  dom.canvasHeight.value = state.height;

  if (resizePaintLayers) {
    state.layers
      .filter((layer) => layer.type === "paint")
      .forEach((layer) => {
        const nextCanvas = document.createElement("canvas");
        nextCanvas.width = state.width;
        nextCanvas.height = state.height;
        nextCanvas.getContext("2d").drawImage(layer.canvas, 0, 0);
        layer.canvas = nextCanvas;
        layer.x = state.width / 2;
        layer.y = state.height / 2;
        layer.width = state.width;
        layer.height = state.height;
      });
  }

  if (oldWidth !== state.width || oldHeight !== state.height) {
    state.crop = null;
    dom.cropActions.hidden = true;
  }
}

function snapshot() {
  return {
    width: state.width,
    height: state.height,
    activeId: state.activeId,
    layers: state.layers.map((layer) => serializeLayer(layer)),
  };
}

function serializeLayer(layer) {
  const serialized = {
    id: layer.id,
    type: layer.type,
    name: layer.name,
    visible: layer.visible,
    opacity: layer.opacity,
    blendMode: layer.blendMode,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    rotation: layer.rotation,
    flipX: layer.flipX,
    flipY: layer.flipY,
    filters: copyFilters(layer.filters),
    fill: layer.fill,
    color: layer.color,
    shape: layer.shape,
    text: layer.text,
    fontSize: layer.fontSize,
    shadow: copyTextShadow(layer.shadow),
    outline: copyTextOutline(layer.outline),
    aspectRatio: layer.aspectRatio || null,
    aspectLocked: layer.aspectLocked,
    assetId: layer.assetId || null,
    src: layer.type === "image" ? null : layer.src || null,
  };

  if (layer.type === "image" && layer.src) {
    serialized.assetId = layer.assetId || registerImageAsset(layer.src);
    layer.assetId = serialized.assetId;
  }

  if (layer.type === "paint" && layer.canvas) {
    serialized.src = layer.canvas.toDataURL("image/png");
  }

  return serialized;
}

function pushHistory() {
  state.history.push(snapshot());
  if (state.history.length > HISTORY_LIMIT) state.history.shift();
  state.future = [];
  updateHistoryButtons();
}

function commitControlHistory() {
  if (!controlSnapshot) return;
  state.history.push(controlSnapshot);
  if (state.history.length > HISTORY_LIMIT) state.history.shift();
  state.future = [];
  controlSnapshot = null;
  updateHistoryButtons();
}

async function restoreSnapshot(nextSnapshot) {
  state.width = nextSnapshot.width;
  state.height = nextSnapshot.height;
  state.activeId = nextSnapshot.activeId;
  state.crop = null;
  dom.cropActions.hidden = true;
  configurePreviewCanvas();
  dom.canvasWidth.value = state.width;
  dom.canvasHeight.value = state.height;
  state.layers = await Promise.all(nextSnapshot.layers.map((layer) => hydrateLayer(layer)));
  renderLayerList();
  syncProperties();
  render();
}

async function hydrateLayer(data) {
  const layer = {
    ...data,
    visible: data.visible !== false,
    opacity: Number(data.opacity ?? 1),
    blendMode: data.blendMode || "source-over",
    rotation: Number(data.rotation ?? 0),
    flipX: Boolean(data.flipX),
    flipY: Boolean(data.flipY),
    filters: copyFilters(data.filters),
    shadow: copyTextShadow(data.shadow),
    outline: copyTextOutline(data.outline),
    aspectRatio: Number(data.aspectRatio) || null,
    aspectLocked: data.aspectLocked ?? (data.type === "image"),
    image: null,
    canvas: null,
  };

  if (layer.type === "image") {
    layer.src = layer.src || getImageAsset(layer.assetId);
    layer.assetId = registerImageAsset(layer.src, layer.assetId);
  }

  if (layer.type === "image" && layer.src) {
    layer.image = await loadImage(layer.src);
    layer.aspectRatio = layer.aspectRatio || layer.image.width / Math.max(layer.image.height, 1);
  }

  if (layer.type === "paint") {
    const paintCanvas = document.createElement("canvas");
    paintCanvas.width = layer.assetWidth || layer.width;
    paintCanvas.height = layer.assetHeight || layer.height;
    if (layer.src) {
      const paintImage = await loadImage(layer.src);
      paintCanvas.getContext("2d").drawImage(paintImage, 0, 0);
    }
    layer.canvas = paintCanvas;
  }

  return layer;
}

function updateHistoryButtons() {
  dom.undoButton.disabled = state.history.length === 0;
  dom.redoButton.disabled = state.future.length === 0;
}

function newCanvas() {
  const nextWidth = Number(dom.canvasWidth.value) || state.width;
  const nextHeight = Number(dom.canvasHeight.value) || state.height;
  const hasWork = state.layers.length > 0;
  const hasSizeChange = nextWidth !== state.width || nextHeight !== state.height;
  if (!hasWork && !hasSizeChange) return;
  if (hasWork && !window.confirm("現在の編集内容をクリアして新規作成しますか？")) return;

  pushHistory();
  state.layers = [];
  state.activeId = null;
  state.crop = null;
  dom.cropActions.hidden = true;
  setCanvasSize(nextWidth, nextHeight, false);
  setTool("select");
  renderLayerList();
  syncProperties();
  render();
}

async function undo() {
  if (state.history.length === 0) return;
  const previous = state.history.pop();
  state.future.push(snapshot());
  updateHistoryButtons();
  await restoreSnapshot(previous);
}

async function redo() {
  if (state.future.length === 0) return;
  const next = state.future.pop();
  state.history.push(snapshot());
  updateHistoryButtons();
  await restoreSnapshot(next);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("画像を読み込めませんでした"));
    image.src = src;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("ファイルを読み込めませんでした"));
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("プロジェクト内の画像を読み込めませんでした"));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(sourceCanvas, mimeType = "image/png", quality) {
  return new Promise((resolve, reject) => {
    sourceCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("キャンバスを保存できませんでした"));
        }
      },
      mimeType,
      quality,
    );
  });
}

async function sourceToBlob(src) {
  if (src.startsWith("data:")) {
    const commaIndex = src.indexOf(",");
    const header = src.slice(0, commaIndex);
    const payload = src.slice(commaIndex + 1);
    const mimeType = header.match(/^data:([^;]+)/)?.[1] || "application/octet-stream";
    const binary = header.includes(";base64") ? atob(payload) : decodeURIComponent(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: mimeType });
  }

  const response = await fetch(src);
  if (!response.ok) throw new Error("画像データを保存できませんでした");
  return response.blob();
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function projectLayerFromLayer(layer, assetMap) {
  const projectLayer = {
    id: layer.id,
    type: layer.type,
    name: layer.name,
    visible: layer.visible,
    opacity: layer.opacity,
    blendMode: layer.blendMode,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    rotation: layer.rotation,
    flipX: layer.flipX,
    flipY: layer.flipY,
    filters: copyFilters(layer.filters),
    fill: layer.fill,
    color: layer.color,
    shape: layer.shape,
    text: layer.text,
    fontSize: layer.fontSize,
    shadow: copyTextShadow(layer.shadow),
    outline: copyTextOutline(layer.outline),
    aspectRatio: layer.aspectRatio || null,
    aspectLocked: layer.aspectLocked,
    assetId: null,
  };

  if (layer.type === "image") {
    const src = layer.src || getImageAsset(layer.assetId);
    if (src) {
      const assetId = layer.assetId || registerImageAsset(src);
      projectLayer.assetId = assetId;
      if (!assetMap.has(assetId)) {
        const blob = await sourceToBlob(src);
        assetMap.set(assetId, {
          blob,
          id: assetId,
          mimeType: blob.type || "application/octet-stream",
          role: "image",
        });
      }
    }
  }

  if (layer.type === "paint" && layer.canvas) {
    const assetId = `paint-${layer.id}`;
    const blob = await canvasToBlob(layer.canvas, "image/png");
    projectLayer.assetId = assetId;
    projectLayer.assetWidth = layer.canvas.width;
    projectLayer.assetHeight = layer.canvas.height;
    assetMap.set(assetId, {
      blob,
      id: assetId,
      mimeType: "image/png",
      role: "paint",
    });
  }

  return projectLayer;
}

async function buildProjectBlob() {
  const assetMap = new Map();
  const layers = [];

  for (const layer of state.layers) {
    layers.push(await projectLayerFromLayer(layer, assetMap));
  }

  const assetEntries = Array.from(assetMap.values());
  const manifest = {
    app: "Layer Canvas",
    version: PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    canvas: {
      width: state.width,
      height: state.height,
    },
    activeId: state.activeId,
    layers,
    assets: assetEntries.map((asset) => ({
      byteLength: asset.blob.size,
      id: asset.id,
      mimeType: asset.mimeType,
      role: asset.role,
    })),
  };
  const manifestBytes = textEncoder.encode(JSON.stringify(manifest));
  const header = new Uint8Array(PROJECT_MAGIC.length + 4);
  header.set(textEncoder.encode(PROJECT_MAGIC), 0);
  new DataView(header.buffer).setUint32(PROJECT_MAGIC.length, manifestBytes.length, true);

  return new Blob([header, manifestBytes, ...assetEntries.map((asset) => asset.blob)], {
    type: "application/octet-stream",
  });
}

async function saveProject() {
  try {
    const blob = await buildProjectBlob();
    downloadBlob(blob, `layer-canvas-${Date.now()}.lcanvas`);
  } catch (error) {
    window.alert(error.message || "プロジェクトを保存できませんでした");
  }
}

async function parseProjectFile(file) {
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength < PROJECT_MAGIC.length + 4) {
    throw new Error("対応していないプロジェクトファイルです");
  }

  const magic = textDecoder.decode(buffer.slice(0, PROJECT_MAGIC.length));
  if (magic !== PROJECT_MAGIC) {
    throw new Error("対応していないプロジェクトファイルです");
  }

  const manifestLength = new DataView(buffer).getUint32(PROJECT_MAGIC.length, true);
  const manifestStart = PROJECT_MAGIC.length + 4;
  const manifestEnd = manifestStart + manifestLength;
  if (manifestEnd > buffer.byteLength) {
    throw new Error("プロジェクトファイルが壊れています");
  }

  const manifest = JSON.parse(textDecoder.decode(buffer.slice(manifestStart, manifestEnd)));
  if (manifest.version !== PROJECT_VERSION || !manifest.canvas || !Array.isArray(manifest.layers)) {
    throw new Error("対応していないプロジェクトファイルです");
  }

  const assetDataUrls = new Map();
  let offset = manifestEnd;
  for (const asset of manifest.assets || []) {
    const end = offset + Number(asset.byteLength || 0);
    if (end > buffer.byteLength) {
      throw new Error("プロジェクト内の画像データが不足しています");
    }
    const blob = new Blob([buffer.slice(offset, end)], {
      type: asset.mimeType || "application/octet-stream",
    });
    assetDataUrls.set(asset.id, await blobToDataUrl(blob));
    offset = end;
  }

  return { assetDataUrls, manifest };
}

async function loadProject(file) {
  try {
    const { assetDataUrls, manifest } = await parseProjectFile(file);
    if (state.layers.length > 0 && !window.confirm("現在の編集内容を置き換えてプロジェクトを開きますか？")) {
      return;
    }

    if (state.layers.length > 0) pushHistory();
    state.future = [];

    const projectLayers = manifest.layers.map((layer) => {
      const nextLayer = { ...layer };
      if ((nextLayer.type === "image" || nextLayer.type === "paint") && nextLayer.assetId) {
        nextLayer.src = assetDataUrls.get(nextLayer.assetId) || null;
      }
      return nextLayer;
    });

    await restoreSnapshot({
      activeId: manifest.activeId,
      height: manifest.canvas.height,
      layers: projectLayers,
      width: manifest.canvas.width,
    });
  } catch (error) {
    window.alert(error.message || "プロジェクトを開けませんでした");
  }
}

async function addImages(files) {
  const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
  if (imageFiles.length === 0) return;

  pushHistory();

  for (const file of imageFiles) {
    const src = await readFileAsDataUrl(file);
    const image = await loadImage(src);
    const assetId = registerImageAsset(src);
    const isFirstLayer = state.layers.length === 0;

    if (isFirstLayer) {
      setCanvasSize(image.naturalWidth || image.width, image.naturalHeight || image.height, false);
    }

    const fitScale = isFirstLayer
      ? Math.min(state.width / image.width, state.height / image.height, 1)
      : Math.min((state.width * 0.72) / image.width, (state.height * 0.72) / image.height, 1);

    const layer = baseLayer({
      type: "image",
      name: file.name.replace(/\.[^.]+$/, "") || "画像",
      x: state.width / 2,
      y: state.height / 2,
      width: Math.max(1, round(image.width * fitScale)),
      height: Math.max(1, round(image.height * fitScale)),
      aspectRatio: image.width / Math.max(image.height, 1),
      aspectLocked: true,
      assetId,
      src,
      image,
    });

    state.layers.push(layer);
    state.activeId = layer.id;
  }

  setTool("select");
  renderLayerList();
  syncProperties();
  render();
}

function baseLayer(options) {
  return {
    id: uid(),
    visible: true,
    opacity: 1,
    blendMode: "source-over",
    x: state.width / 2,
    y: state.height / 2,
    width: 240,
    height: 180,
    rotation: 0,
    flipX: false,
    flipY: false,
    filters: copyFilters(),
    shadow: copyTextShadow(),
    outline: copyTextOutline(),
    aspectRatio: null,
    aspectLocked: false,
    fill: "#2dd4bf",
    color: "#172033",
    ...options,
  };
}

function addShape(shape) {
  pushHistory();
  const layer = baseLayer({
    type: "shape",
    shape,
    name: shape === "ellipse" ? "円" : "四角",
    width: Math.min(320, state.width * 0.42),
    height: Math.min(220, state.height * 0.32),
    fill: shape === "ellipse" ? "#f5b841" : "#2dd4bf",
  });
  state.layers.push(layer);
  state.activeId = layer.id;
  setTool("select");
  if (isMobileLayout()) setMobilePanel("properties");
  renderLayerList();
  syncProperties();
  render();
}

function addText() {
  pushHistory();
  const layer = baseLayer({
    type: "text",
    name: "テキスト",
    text: "Text",
    fontSize: Math.max(32, Math.min(86, state.width * 0.07)),
    color: "#172033",
    shadow: copyTextShadow(),
    outline: copyTextOutline(),
  });
  measureTextLayer(layer);
  state.layers.push(layer);
  state.activeId = layer.id;
  setTool("select");
  if (isMobileLayout()) setMobilePanel("properties");
  renderLayerList();
  syncProperties();
  render();
}

function ensurePaintLayer() {
  const selected = activeLayer();
  if (selected && selected.type === "paint") return selected;

  const canvasLayer = document.createElement("canvas");
  canvasLayer.width = state.width;
  canvasLayer.height = state.height;
  const layer = baseLayer({
    type: "paint",
    name: "ブラシ",
    x: state.width / 2,
    y: state.height / 2,
    width: state.width,
    height: state.height,
    canvas: canvasLayer,
  });
  state.layers.push(layer);
  state.activeId = layer.id;
  renderLayerList();
  syncProperties();
  return layer;
}

function measureTextLayer(layer) {
  const fontSize = Number(layer.fontSize || 72);
  const outline = copyTextOutline(layer.outline);
  const outlinePad = outline.enabled ? outline.width * 2 : 0;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = `700 ${fontSize}px "Yu Gothic UI", "Hiragino Sans", "Meiryo", sans-serif`;
  const lines = String(layer.text || "").split("\n");
  const width = Math.max(...lines.map((line) => ctx.measureText(line || " ").width), 24);
  layer.width = Math.ceil(width + fontSize * 0.42 + outlinePad);
  layer.height = Math.ceil(lines.length * fontSize * 1.18 + fontSize * 0.22 + outlinePad);
  ctx.restore();
}

function render() {
  const fast = shouldUseFastPreview();
  beginPreviewRender(fast);
  drawScene(ctx, { fast });

  const selected = activeLayer();
  if (selected && selected.visible) drawSelection(selected);
  if (state.crop) drawCropOverlay();
  finishPreviewRender();
}

function drawScene(targetContext, options = {}) {
  state.layers.forEach((layer) => {
    if (!layer.visible) return;
    drawLayer(targetContext, layer, options);
  });
}

function drawLayer(targetContext, layer, options = {}) {
  targetContext.save();
  targetContext.globalAlpha = clamp(Number(layer.opacity ?? 1), 0, 1);
  targetContext.globalCompositeOperation = layer.blendMode || "source-over";
  targetContext.filter = options.fast || !hasActiveFilters(layer.filters) ? "none" : filtersToCss(layer.filters);
  targetContext.translate(layer.x, layer.y);
  targetContext.rotate(degToRad(layer.rotation || 0));
  targetContext.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);

  if (layer.type === "image" && layer.image) {
    targetContext.drawImage(layer.image, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
  }

  if (layer.type === "paint" && layer.canvas) {
    targetContext.drawImage(layer.canvas, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
  }

  if (layer.type === "shape") {
    targetContext.fillStyle = layer.fill || "#2dd4bf";
    targetContext.beginPath();
    if (layer.shape === "ellipse") {
      targetContext.ellipse(0, 0, layer.width / 2, layer.height / 2, 0, 0, Math.PI * 2);
    } else {
      targetContext.rect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
    }
    targetContext.fill();
  }

  if (layer.type === "text") {
    const fontSize = Number(layer.fontSize || 72);
    const lineHeight = fontSize * 1.18;
    const lines = String(layer.text || "").split("\n");
    const shadow = copyTextShadow(layer.shadow);
    const outline = copyTextOutline(layer.outline);
    targetContext.fillStyle = layer.color || "#172033";
    targetContext.font = `700 ${fontSize}px "Yu Gothic UI", "Hiragino Sans", "Meiryo", sans-serif`;
    targetContext.textAlign = "center";
    targetContext.textBaseline = "middle";
    targetContext.lineJoin = "round";
    targetContext.miterLimit = 2;
    if (shadow.enabled) {
      targetContext.shadowColor = hexToRgba(shadow.color, shadow.opacity);
      targetContext.shadowBlur = shadow.blur;
      targetContext.shadowOffsetX = shadow.offsetX;
      targetContext.shadowOffsetY = shadow.offsetY;
    }
    const startY = -((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => {
      if (outline.enabled && outline.width > 0) {
        targetContext.strokeStyle = outline.color;
        targetContext.lineWidth = outline.width;
        targetContext.strokeText(line || " ", 0, startY + index * lineHeight);
      }
      targetContext.fillText(line || " ", 0, startY + index * lineHeight);
    });
  }

  targetContext.restore();
}

function getDisplayScale() {
  const rect = canvas.getBoundingClientRect();
  return rect.width > 0 ? rect.width / state.width : 1;
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) * state.width) / rect.width,
    y: ((event.clientY - rect.top) * state.height) / rect.height,
  };
}

function rotatePoint(point, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

function worldToLocal(layer, point) {
  const angle = -degToRad(layer.rotation || 0);
  return rotatePoint({ x: point.x - layer.x, y: point.y - layer.y }, angle);
}

function localToWorld(layer, point) {
  const rotated = rotatePoint(point, degToRad(layer.rotation || 0));
  return {
    x: rotated.x + layer.x,
    y: rotated.y + layer.y,
  };
}

function layerContains(layer, point) {
  if (layer.type === "paint" || !layer.visible) return false;
  const local = worldToLocal(layer, point);
  return Math.abs(local.x) <= layer.width / 2 && Math.abs(local.y) <= layer.height / 2;
}

function getLayerAt(point) {
  for (let index = state.layers.length - 1; index >= 0; index -= 1) {
    const layer = state.layers[index];
    if (layerContains(layer, point)) return layer;
  }
  return null;
}

function getLayerCorners(layer) {
  const halfWidth = layer.width / 2;
  const halfHeight = layer.height / 2;
  return {
    nw: localToWorld(layer, { x: -halfWidth, y: -halfHeight }),
    ne: localToWorld(layer, { x: halfWidth, y: -halfHeight }),
    se: localToWorld(layer, { x: halfWidth, y: halfHeight }),
    sw: localToWorld(layer, { x: -halfWidth, y: halfHeight }),
  };
}

function canResize(layer) {
  return layer && (layer.type === "image" || layer.type === "shape");
}

function canTransform(layer) {
  return layer && layer.type !== "paint";
}

function drawSelection(layer) {
  const scale = getDisplayScale();
  const lineWidth = 2 / scale;
  const handleSize = 10 / scale;
  const corners = getLayerCorners(layer);

  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = "#0f9f8f";
  ctx.setLineDash([7 / scale, 5 / scale]);
  ctx.beginPath();
  ctx.moveTo(corners.nw.x, corners.nw.y);
  ctx.lineTo(corners.ne.x, corners.ne.y);
  ctx.lineTo(corners.se.x, corners.se.y);
  ctx.lineTo(corners.sw.x, corners.sw.y);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  if (canTransform(layer)) {
    const topMid = {
      x: (corners.nw.x + corners.ne.x) / 2,
      y: (corners.nw.y + corners.ne.y) / 2,
    };
    const rotationPoint = localToWorld(layer, { x: 0, y: -layer.height / 2 - 38 / scale });
    ctx.strokeStyle = "#0f9f8f";
    ctx.beginPath();
    ctx.moveTo(topMid.x, topMid.y);
    ctx.lineTo(rotationPoint.x, rotationPoint.y);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(rotationPoint.x, rotationPoint.y, handleSize * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (canResize(layer)) {
    ctx.fillStyle = "#ffffff";
    Object.values(corners).forEach((point) => {
      ctx.fillRect(point.x - handleSize / 2, point.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(point.x - handleSize / 2, point.y - handleSize / 2, handleSize, handleSize);
    });
  }

  ctx.restore();
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function hitSelectionHandle(layer, point) {
  if (!canTransform(layer)) return null;
  const scale = getDisplayScale();
  const threshold = 13 / scale;
  const corners = getLayerCorners(layer);
  const rotationPoint = localToWorld(layer, { x: 0, y: -layer.height / 2 - 38 / scale });

  if (distance(point, rotationPoint) <= threshold) return { type: "rotate" };
  if (!canResize(layer)) return null;

  const handles = [
    ["nw", "se"],
    ["ne", "sw"],
    ["se", "nw"],
    ["sw", "ne"],
  ];
  for (const [handle, opposite] of handles) {
    if (distance(point, corners[handle]) <= threshold) {
      return { type: "resize", handle, oppositePoint: corners[opposite] };
    }
  }
  return null;
}

function drawCropOverlay() {
  const crop = normalizeCrop(state.crop);
  if (!crop || crop.width < 1 || crop.height < 1) return;
  const scale = getDisplayScale();
  ctx.save();
  ctx.fillStyle = "rgba(23, 32, 51, 0.46)";
  ctx.beginPath();
  ctx.rect(0, 0, state.width, state.height);
  ctx.rect(crop.x, crop.y, crop.width, crop.height);
  ctx.fill("evenodd");
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2 / scale;
  ctx.setLineDash([8 / scale, 5 / scale]);
  ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);
  ctx.restore();
}

function normalizeCrop(crop) {
  if (!crop) return null;
  const x = clamp(Math.min(crop.x, crop.x + crop.width), 0, state.width);
  const y = clamp(Math.min(crop.y, crop.y + crop.height), 0, state.height);
  const endX = clamp(Math.max(crop.x, crop.x + crop.width), 0, state.width);
  const endY = clamp(Math.max(crop.y, crop.y + crop.height), 0, state.height);
  return {
    x: round(x),
    y: round(y),
    width: Math.max(1, round(endX - x)),
    height: Math.max(1, round(endY - y)),
  };
}

function setTool(tool) {
  state.tool = tool;
  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });
  if (isMobileLayout()) setMobilePanel("closed");
  if (tool !== "crop") {
    state.crop = null;
    dom.cropActions.hidden = true;
  }
  queueRender();
}

function startBrushStroke(point) {
  pushHistory();
  const layer = ensurePaintLayer();
  state.interaction = {
    type: "brush",
    layerId: layer.id,
    lastPoint: point,
    erase: state.tool === "eraser",
  };
  drawBrushSegment(layer, point, point, state.interaction.erase);
}

function drawBrushSegment(layer, from, to, erase = false) {
  const paintContext = layer.canvas.getContext("2d");
  paintContext.save();
  paintContext.lineCap = "round";
  paintContext.lineJoin = "round";
  paintContext.lineWidth = state.brush.size;
  paintContext.globalCompositeOperation = erase ? "destination-out" : "source-over";
  paintContext.strokeStyle = state.brush.color;
  paintContext.fillStyle = state.brush.color;
  paintContext.beginPath();
  if (distance(from, to) < 0.5) {
    paintContext.arc(to.x, to.y, state.brush.size / 2, 0, Math.PI * 2);
    paintContext.fill();
  } else {
    paintContext.moveTo(from.x, from.y);
    paintContext.lineTo(to.x, to.y);
    paintContext.stroke();
  }
  paintContext.restore();
  queueRender();
}

function onPointerDown(event) {
  const point = getCanvasPoint(event);
  canvas.setPointerCapture(event.pointerId);
  event.preventDefault();

  if (state.tool === "brush" || state.tool === "eraser") {
    startBrushStroke(point);
    return;
  }

  if (state.tool === "crop") {
    state.crop = { x: point.x, y: point.y, width: 0, height: 0 };
    state.interaction = { type: "crop", startPoint: point };
    dom.cropActions.hidden = false;
    queueRender();
    return;
  }

  const selected = activeLayer();
  const handle = selected ? hitSelectionHandle(selected, point) : null;
  if (selected && handle?.type === "rotate") {
    pushHistory();
    state.interaction = {
      type: "rotate",
      layerId: selected.id,
      offset: Math.atan2(point.y - selected.y, point.x - selected.x) - degToRad(selected.rotation),
    };
    return;
  }

  if (selected && handle?.type === "resize") {
    pushHistory();
    state.interaction = {
      type: "resize",
      layerId: selected.id,
      oppositePoint: handle.oppositePoint,
    };
    return;
  }

  const hitLayer = getLayerAt(point);
  state.activeId = hitLayer ? hitLayer.id : null;
  renderLayerList();
  syncProperties();

  if (hitLayer) {
    pushHistory();
    state.interaction = {
      type: "move",
      layerId: hitLayer.id,
      startPoint: point,
      startX: hitLayer.x,
      startY: hitLayer.y,
    };
  } else {
    state.interaction = null;
    queueRender();
  }
}

function onPointerMove(event) {
  if (!state.interaction) return;
  const point = getCanvasPoint(event);
  const layer = state.layers.find((item) => item.id === state.interaction.layerId);

  if (state.interaction.type === "brush" && layer) {
    drawBrushSegment(layer, state.interaction.lastPoint, point, state.interaction.erase);
    state.interaction.lastPoint = point;
    return;
  }

  if (state.interaction.type === "crop") {
    state.crop = {
      x: state.interaction.startPoint.x,
      y: state.interaction.startPoint.y,
      width: point.x - state.interaction.startPoint.x,
      height: point.y - state.interaction.startPoint.y,
    };
    queueRender();
    return;
  }

  if (!layer) return;

  if (state.interaction.type === "move") {
    const deltaX = point.x - state.interaction.startPoint.x;
    const deltaY = point.y - state.interaction.startPoint.y;
    layer.x = state.interaction.startX + deltaX;
    layer.y = state.interaction.startY + deltaY;
  }

  if (state.interaction.type === "rotate") {
    const angle = Math.atan2(point.y - layer.y, point.x - layer.x) - state.interaction.offset;
    layer.rotation = Math.round(radToDeg(angle));
  }

  if (state.interaction.type === "resize") {
    resizeLayerFromPoint(layer, point, state.interaction.oppositePoint);
  }

  queuePropertiesSync(false);
  queueRender();
}

function onPointerUp(event) {
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  state.interaction = null;
  syncProperties(false);
  renderLayerList();
  queueRender();
}

function resizeLayerFromPoint(layer, point, oppositePoint) {
  const rotation = degToRad(layer.rotation || 0);
  const delta = rotatePoint({ x: point.x - oppositePoint.x, y: point.y - oppositePoint.y }, -rotation);
  const signX = delta.x >= 0 ? 1 : -1;
  const signY = delta.y >= 0 ? 1 : -1;
  let nextWidth = Math.max(12, Math.abs(delta.x));
  let nextHeight = Math.max(12, Math.abs(delta.y));

  if (layer.type === "image" && layer.aspectLocked !== false) {
    const aspectRatio = getLayerAspectRatio(layer);
    if (nextWidth / nextHeight > aspectRatio) {
      nextWidth = nextHeight * aspectRatio;
    } else {
      nextHeight = nextWidth / aspectRatio;
    }
  }

  const adjustedDelta = {
    x: signX * nextWidth,
    y: signY * nextHeight,
  };
  const centerOffset = rotatePoint({ x: adjustedDelta.x / 2, y: adjustedDelta.y / 2 }, rotation);
  layer.width = nextWidth;
  layer.height = nextHeight;
  layer.x = oppositePoint.x + centerOffset.x;
  layer.y = oppositePoint.y + centerOffset.y;
}

function applyCrop() {
  const crop = normalizeCrop(state.crop);
  if (!crop || crop.width < 4 || crop.height < 4) return;
  pushHistory();

  state.layers.forEach((layer) => {
    if (layer.type === "paint") {
      const nextCanvas = document.createElement("canvas");
      nextCanvas.width = crop.width;
      nextCanvas.height = crop.height;
      nextCanvas
        .getContext("2d")
        .drawImage(layer.canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
      layer.canvas = nextCanvas;
      layer.x = crop.width / 2;
      layer.y = crop.height / 2;
      layer.width = crop.width;
      layer.height = crop.height;
      return;
    }
    layer.x -= crop.x;
    layer.y -= crop.y;
  });

  setCanvasSize(crop.width, crop.height, false);
  state.crop = null;
  dom.cropActions.hidden = true;
  setTool("select");
  renderLayerList();
  syncProperties();
  render();
}

function cancelCrop() {
  state.crop = null;
  dom.cropActions.hidden = true;
  setTool("select");
}

function renderLayerList() {
  dom.layerList.textContent = "";

  if (state.layers.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "レイヤーはありません";
    dom.layerList.append(empty);
    return;
  }

  [...state.layers]
    .map((layer, index) => ({ layer, index }))
    .reverse()
    .forEach(({ layer, index }) => {
      const row = document.createElement("div");
      row.className = `layer-row${layer.id === state.activeId ? " is-active" : ""}`;
      row.dataset.id = layer.id;
      row.tabIndex = 0;
      row.setAttribute("role", "button");

      const thumb = document.createElement("span");
      thumb.className = "layer-thumb";
      if (layer.type === "image" && layer.src) {
        const image = document.createElement("img");
        image.alt = "";
        image.src = layer.src;
        thumb.append(image);
      } else {
        thumb.style.backgroundColor = layer.fill || layer.color || "#2dd4bf";
        const mark = document.createElement("span");
        mark.textContent = layerLabel(layer);
        thumb.append(mark);
      }

      const main = document.createElement("span");
      main.className = "layer-main";
      const name = document.createElement("span");
      name.className = "layer-name";
      name.textContent = layer.name;
      const meta = document.createElement("span");
      meta.className = "layer-meta";
      meta.textContent = `${layerLabel(layer)} / ${Math.round(layer.opacity * 100)}%`;
      main.append(name, meta);

      const actions = document.createElement("span");
      actions.className = "layer-buttons";
      actions.append(
        layerButton(layer.visible ? "非表" : "表示", "toggle", layer.id),
        layerButton("上", "up", layer.id, index === state.layers.length - 1),
        layerButton("下", "down", layer.id, index === 0),
        layerButton("複製", "duplicate", layer.id),
      );

      row.append(thumb, main, actions);
      row.addEventListener("click", () => {
        state.activeId = layer.id;
        renderLayerList();
        syncProperties();
        if (isMobileLayout()) setMobilePanel("properties");
        render();
      });
      row.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        state.activeId = layer.id;
        renderLayerList();
        syncProperties();
        if (isMobileLayout()) setMobilePanel("properties");
        render();
      });
      dom.layerList.append(row);
    });
}

function layerButton(label, action, id, disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.action = action;
  button.dataset.id = id;
  button.disabled = disabled;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    handleLayerAction(action, id);
  });
  return button;
}

function handleLayerAction(action, id) {
  const layer = state.layers.find((item) => item.id === id);
  if (!layer) return;

  if (action === "toggle") {
    pushHistory();
    layer.visible = !layer.visible;
  }

  if (action === "up") moveLayer(id, 1);
  if (action === "down") moveLayer(id, -1);
  if (action === "duplicate") duplicateLayer(id);

  renderLayerList();
  syncProperties(false);
  render();
}

function moveLayer(id, direction) {
  const index = state.layers.findIndex((layer) => layer.id === id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= state.layers.length) return;
  pushHistory();
  const [layer] = state.layers.splice(index, 1);
  state.layers.splice(nextIndex, 0, layer);
}

function duplicateLayer(id = state.activeId) {
  const layer = state.layers.find((item) => item.id === id);
  if (!layer) return;
  pushHistory();
  const copy = cloneLayer(layer);
  const index = state.layers.findIndex((item) => item.id === id);
  state.layers.splice(index + 1, 0, copy);
  state.activeId = copy.id;
  renderLayerList();
  syncProperties();
  render();
}

function cloneLayer(layer) {
  const copy = {
    ...layer,
    id: uid(),
    name: `${layer.name} コピー`,
    x: layer.type === "paint" ? layer.x : layer.x + 24,
    y: layer.type === "paint" ? layer.y : layer.y + 24,
    filters: copyFilters(layer.filters),
    shadow: copyTextShadow(layer.shadow),
    outline: copyTextOutline(layer.outline),
    aspectRatio: layer.aspectRatio,
    aspectLocked: layer.aspectLocked,
  };

  if (layer.type === "paint") {
    const nextCanvas = document.createElement("canvas");
    nextCanvas.width = layer.canvas.width;
    nextCanvas.height = layer.canvas.height;
    nextCanvas.getContext("2d").drawImage(layer.canvas, 0, 0);
    copy.canvas = nextCanvas;
  }

  if (layer.type === "image") {
    copy.image = layer.image;
    copy.src = layer.src;
  }

  return copy;
}

function deleteLayer(id = state.activeId) {
  const index = state.layers.findIndex((layer) => layer.id === id);
  if (index < 0) return;
  pushHistory();
  state.layers.splice(index, 1);
  const next = state.layers[Math.min(index, state.layers.length - 1)] || topLayer();
  state.activeId = next ? next.id : null;
  renderLayerList();
  syncProperties();
  render();
}

function syncProperties(updateLayerList = true) {
  const layer = activeLayer();
  dom.propertiesForm.classList.toggle("is-empty", !layer);

  const controls = dom.propertiesForm.querySelectorAll("input, select, textarea, button");
  controls.forEach((control) => {
    control.disabled = !layer;
  });

  dom.duplicateLayerButton.disabled = !layer;
  dom.deleteLayerButton.disabled = !layer;

  if (!layer) return;

  const isPaint = layer.type === "paint";
  const isText = layer.type === "text";
  const isShape = layer.type === "shape";
  const isImage = layer.type === "image";
  const shadow = copyTextShadow(layer.shadow);
  const outline = copyTextOutline(layer.outline);

  dom.layerName.value = layer.name || "";
  dom.layerX.value = round(layer.x);
  dom.layerY.value = round(layer.y);
  dom.layerWidth.value = round(layer.width);
  dom.layerHeight.value = round(layer.height);
  dom.layerRotation.value = round(layer.rotation || 0);
  dom.layerOpacity.value = round((layer.opacity ?? 1) * 100);
  dom.blendMode.value = layer.blendMode || "source-over";
  dom.brightness.value = copyFilters(layer.filters).brightness;
  dom.contrast.value = copyFilters(layer.filters).contrast;
  dom.saturation.value = copyFilters(layer.filters).saturation;
  dom.blur.value = copyFilters(layer.filters).blur;
  dom.aspectLockLabel.hidden = !isImage;
  dom.aspectLock.checked = layer.aspectLocked !== false;

  dom.appearanceGroup.hidden = !(isShape || isText);
  dom.textContentLabel.hidden = !isText;
  dom.fontSizeLabel.hidden = !isText;
  dom.textOutlineGroup.hidden = !isText;
  dom.textShadowGroup.hidden = !isText;
  dom.fillColor.value = isText ? layer.color || "#172033" : layer.fill || "#2dd4bf";
  dom.textContent.value = layer.text || "";
  dom.fontSize.value = layer.fontSize || 72;
  dom.textOutlineEnabled.checked = outline.enabled;
  dom.textOutlineColor.value = outline.color;
  dom.textOutlineWidth.value = round(outline.width);
  dom.textShadowEnabled.checked = shadow.enabled;
  dom.textShadowColor.value = shadow.color;
  dom.textShadowOpacity.value = round(shadow.opacity);
  dom.textShadowBlur.value = round(shadow.blur);
  dom.textShadowX.value = round(shadow.offsetX);
  dom.textShadowY.value = round(shadow.offsetY);

  dom.layerX.disabled = isPaint;
  dom.layerY.disabled = isPaint;
  dom.layerWidth.disabled = isPaint || isText;
  dom.layerHeight.disabled = isPaint || isText;
  dom.layerRotation.disabled = isPaint;
  dom.flipXButton.disabled = isPaint;
  dom.flipYButton.disabled = isPaint;

  if (updateLayerList) renderLayerList();
}

function applyPropertyValues(event) {
  const layer = activeLayer();
  if (!layer) return;

  layer.name = dom.layerName.value || layerLabel(layer);
  layer.opacity = Number(dom.layerOpacity.value) / 100;
  layer.blendMode = dom.blendMode.value;
  layer.filters = {
    brightness: Number(dom.brightness.value),
    contrast: Number(dom.contrast.value),
    saturation: Number(dom.saturation.value),
    blur: Number(dom.blur.value),
  };

  if (layer.type !== "paint") {
    layer.x = numericField(dom.layerX, layer.x);
    layer.y = numericField(dom.layerY, layer.y);
    layer.rotation = numericField(dom.layerRotation, 0);
  }

  if (layer.type === "image") {
    const wasLocked = layer.aspectLocked !== false;
    layer.aspectLocked = dom.aspectLock.checked;
    if (!wasLocked && layer.aspectLocked) {
      layer.aspectRatio = Math.max(1, layer.width) / Math.max(1, layer.height);
    }

    let nextWidth = Math.max(1, numericField(dom.layerWidth, layer.width));
    let nextHeight = Math.max(1, numericField(dom.layerHeight, layer.height));

    if (layer.aspectLocked) {
      const aspectRatio = getLayerAspectRatio(layer);
      if (event?.target === dom.layerHeight) {
        nextWidth = nextHeight * aspectRatio;
      } else {
        nextHeight = nextWidth / aspectRatio;
      }
    }

    layer.width = nextWidth;
    layer.height = nextHeight;
    dom.layerWidth.value = round(layer.width);
    dom.layerHeight.value = round(layer.height);
  } else if (layer.type === "shape") {
    layer.width = Math.max(1, numericField(dom.layerWidth, layer.width));
    layer.height = Math.max(1, numericField(dom.layerHeight, layer.height));
  }

  if (layer.type === "shape") {
    layer.fill = dom.fillColor.value;
  }

  if (layer.type === "text") {
    layer.color = dom.fillColor.value;
    layer.text = dom.textContent.value;
    layer.fontSize = Number(dom.fontSize.value) || layer.fontSize;
    layer.shadow = {
      enabled: dom.textShadowEnabled.checked,
      color: dom.textShadowColor.value,
      opacity: Number(dom.textShadowOpacity.value),
      blur: Number(dom.textShadowBlur.value),
      offsetX: numericField(dom.textShadowX, DEFAULT_TEXT_SHADOW.offsetX),
      offsetY: numericField(dom.textShadowY, DEFAULT_TEXT_SHADOW.offsetY),
    };
    layer.outline = {
      enabled: dom.textOutlineEnabled.checked,
      color: dom.textOutlineColor.value,
      width: Number(dom.textOutlineWidth.value),
    };
    measureTextLayer(layer);
    dom.layerWidth.value = round(layer.width);
    dom.layerHeight.value = round(layer.height);
  }

  if (!event || event.target === dom.layerName || event.target === dom.layerOpacity) {
    renderLayerList();
  }
  queueRender();
}

function numericField(input, fallback) {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function resetFilters() {
  const layer = activeLayer();
  if (!layer) return;
  pushHistory();
  layer.filters = copyFilters();
  syncProperties();
  render();
}

function flipSelected(axis) {
  const layer = activeLayer();
  if (!layer || layer.type === "paint") return;
  pushHistory();
  if (axis === "x") layer.flipX = !layer.flipX;
  if (axis === "y") layer.flipY = !layer.flipY;
  render();
}

function applyCanvasSize() {
  const width = Number(dom.canvasWidth.value);
  const height = Number(dom.canvasHeight.value);
  if (!width || !height) return;
  pushHistory();
  setCanvasSize(width, height, true);
  syncProperties(false);
  render();
}

function trimTransparentCanvas(sourceCanvas) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const sourceContext = sourceCanvas.getContext("2d");
  let pixels;

  try {
    pixels = sourceContext.getImageData(0, 0, width, height).data;
  } catch (error) {
    return sourceCanvas;
  }

  let top = height;
  let right = -1;
  let bottom = -1;
  let left = width;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha === 0) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  if (right < left || bottom < top) {
    return sourceCanvas;
  }

  const trimmedWidth = right - left + 1;
  const trimmedHeight = bottom - top + 1;

  if (trimmedWidth === width && trimmedHeight === height) {
    return sourceCanvas;
  }

  const trimmedCanvas = document.createElement("canvas");
  trimmedCanvas.width = trimmedWidth;
  trimmedCanvas.height = trimmedHeight;
  trimmedCanvas
    .getContext("2d")
    .drawImage(sourceCanvas, left, top, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);
  return trimmedCanvas;
}

function exportImage(mimeType) {
  const output = document.createElement("canvas");
  output.width = state.width;
  output.height = state.height;
  const outputContext = output.getContext("2d");
  outputContext.imageSmoothingEnabled = true;
  outputContext.imageSmoothingQuality = "high";

  if (mimeType === "image/jpeg") {
    outputContext.fillStyle = "#ffffff";
    outputContext.fillRect(0, 0, output.width, output.height);
  }

  drawScene(outputContext, { fast: false });

  const saveCanvas = mimeType === "image/png" ? trimTransparentCanvas(output) : output;

  saveCanvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `layer-canvas-${Date.now()}.${mimeType === "image/png" ? "png" : "jpg"}`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    mimeType,
    mimeType === "image/jpeg" ? 0.92 : undefined,
  );
}

function bindEvents() {
  dom.newCanvasButton.addEventListener("click", newCanvas);
  dom.openProjectButton.addEventListener("click", () => dom.projectFileInput.click());
  dom.saveProjectButton.addEventListener("click", saveProject);
  dom.projectFileInput.addEventListener("change", () => {
    const [file] = dom.projectFileInput.files;
    if (file) loadProject(file);
    dom.projectFileInput.value = "";
  });
  dom.addImageButton.addEventListener("click", () => dom.fileInput.click());
  dom.fileInput.addEventListener("change", () => {
    addImages(dom.fileInput.files);
    dom.fileInput.value = "";
  });

  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.addEventListener("click", () => setTool(button.dataset.tool));
  });

  dom.addTextButton.addEventListener("click", addText);
  dom.addRectButton.addEventListener("click", () => addShape("rect"));
  dom.addEllipseButton.addEventListener("click", () => addShape("ellipse"));
  dom.applyCanvasSize.addEventListener("click", applyCanvasSize);
  dom.fitViewButton.addEventListener("click", () => canvas.scrollIntoView({ block: "center", inline: "center" }));
  dom.applyCropButton.addEventListener("click", applyCrop);
  dom.cancelCropButton.addEventListener("click", cancelCrop);
  dom.undoButton.addEventListener("click", undo);
  dom.redoButton.addEventListener("click", redo);
  dom.duplicateLayerButton.addEventListener("click", () => duplicateLayer());
  dom.deleteLayerButton.addEventListener("click", () => deleteLayer());
  dom.flipXButton.addEventListener("click", () => flipSelected("x"));
  dom.flipYButton.addEventListener("click", () => flipSelected("y"));
  dom.resetFiltersButton.addEventListener("click", resetFilters);

  document.querySelectorAll("[data-export]").forEach((button) => {
    button.addEventListener("click", () => exportImage(button.dataset.export));
  });

  dom.mobilePanelButtons.forEach((button) => {
    button.addEventListener("click", () => setMobilePanel(button.dataset.mobilePanel));
  });
  dom.mobileSheetScrim.addEventListener("click", () => setMobilePanel("closed"));
  if (MOBILE_QUERY.addEventListener) {
    MOBILE_QUERY.addEventListener("change", syncMobileLayout);
  } else {
    MOBILE_QUERY.addListener(syncMobileLayout);
  }

  dom.brushColor.addEventListener("input", () => {
    state.brush.color = dom.brushColor.value;
  });
  dom.brushSize.addEventListener("input", () => {
    state.brush.size = Number(dom.brushSize.value);
  });

  dom.propertiesForm.addEventListener("pointerdown", (event) => {
    if (event.target.matches("input, select, textarea") && !event.target.disabled && !controlSnapshot) {
      controlSnapshot = snapshot();
    }
  });

  dom.propertiesForm.addEventListener("focusin", (event) => {
    if (event.target.matches("input, select, textarea") && !event.target.disabled && !controlSnapshot) {
      controlSnapshot = snapshot();
    }
  });

  dom.propertiesForm.addEventListener("input", applyPropertyValues);
  dom.propertiesForm.addEventListener("change", commitControlHistory);
  dom.propertiesForm.addEventListener("focusout", commitControlHistory);

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  dom.dropZone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dom.dropZone.classList.add("is-dragging");
  });
  dom.dropZone.addEventListener("dragover", (event) => event.preventDefault());
  dom.dropZone.addEventListener("dragleave", () => {
    dom.dropZone.classList.remove("is-dragging");
  });
  dom.dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dom.dropZone.classList.remove("is-dragging");
    addImages(event.dataTransfer.files);
  });

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const modifier = event.ctrlKey || event.metaKey;

    if (modifier && key === "z" && !event.shiftKey) {
      event.preventDefault();
      undo();
    }
    if ((modifier && key === "y") || (modifier && event.shiftKey && key === "z")) {
      event.preventDefault();
      redo();
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      if (document.activeElement?.matches("input, textarea")) return;
      event.preventDefault();
      deleteLayer();
    }
    if (event.key === "Escape" && state.tool === "crop") cancelCrop();
    if (event.key === "Escape" && isMobileLayout() && state.mobilePanel !== "closed") setMobilePanel("closed");
  });
}

setCanvasSize(state.width, state.height, false);
bindEvents();
renderLayerList();
syncProperties();
syncMobileLayout();
render();
