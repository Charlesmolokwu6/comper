import type maplibregl from "maplibre-gl";

/**
 * Settings that keep our maps smooth on phones. Many phones have 3× screens; drawing the map at
 * 2× looks the same and is about half the work. Labels and tiles appear at once instead of
 * fading in, which is less redrawing while moving.
 */
export function fastMapOptions(): Partial<maplibregl.MapOptions> {
  return {
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    fadeDuration: 0,
    maxTileCacheSize: 400,
  };
}

/**
 * Keep a map drawn: resize it when its box changes size, and redraw when the person comes back
 * to the page. Phones may drop the map's graphics while another app is open; when that happens
 * and the browser doesn't give them back, `onLost` is called so the map can be made again.
 */
export function keepMapAlive(
  m: maplibregl.Map,
  box: HTMLElement,
  onLost?: () => void
): () => void {
  const ro =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => m.resize())
      : null;
  ro?.observe(box);
  let lost = false;
  let check: number | undefined;
  const canvas = m.getCanvas();
  const onContextLost = () => {
    lost = true;
  };
  const onContextBack = () => {
    lost = false;
  };
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextBack);
  const back = () => {
    if (document.visibilityState !== "visible") return;
    m.resize();
    m.triggerRepaint();
    // Give the browser a moment to restore the graphics before starting over.
    window.clearTimeout(check);
    check = window.setTimeout(() => {
      if (lost && onLost) onLost();
    }, 1500);
  };
  document.addEventListener("visibilitychange", back);
  window.addEventListener("pageshow", back);
  return () => {
    ro?.disconnect();
    window.clearTimeout(check);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    canvas.removeEventListener("webglcontextrestored", onContextBack);
    document.removeEventListener("visibilitychange", back);
    window.removeEventListener("pageshow", back);
  };
}
