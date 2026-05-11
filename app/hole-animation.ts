/**
 * Hole-eat exit transition — ragged polygon clip-path expands from click point,
 * then redirects. No iframe.
 */

export function holeExit(
  originX: number,
  originY: number,
  accent: string = "#1B1918",
  targetUrl: string = "https://learn.nextwork.org/",
) {
  document.body.style.pointerEvents = "none";

  // ── Wrapper (covers viewport, clipped to a tiny circle at start) ──
  let wrapper = document.getElementById("hole-wrapper") as HTMLElement | null;
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.id = "hole-wrapper";
    wrapper.style.cssText =
      "position:fixed;inset:0;z-index:9999;pointer-events:none;opacity:0;" +
      "background:#F8F5F0;";
    document.body.appendChild(wrapper);
  }

  wrapper.style.opacity = "1";
  wrapper.style.background = "#F8F5F0";
  wrapper.style.clipPath = "circle(0%)";

  // ── SVG Border & Inner Shadow ──
  let svg = document.getElementById(
    "hole-border-svg",
  ) as unknown as SVGSVGElement | null;
  let poly = document.getElementById(
    "hole-border-poly",
  ) as unknown as SVGPolygonElement | null;
  let shadowPoly = document.getElementById(
    "hole-inner-shadow",
  ) as unknown as SVGPolygonElement | null;

  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "hole-border-svg";
    svg.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0;transition:opacity 0.2s ease;";

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const filter = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "filter",
    );
    filter.id = "inner-shadow-blur";
    const feBlur = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feGaussianBlur",
    );
    feBlur.setAttribute("stdDeviation", "15");
    filter.appendChild(feBlur);
    defs.appendChild(filter);
    svg.appendChild(defs);

    shadowPoly = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polygon",
    );
    shadowPoly.id = "hole-inner-shadow";
    shadowPoly.setAttribute("fill", "none");
    shadowPoly.setAttribute("stroke", "rgba(0,0,0,0.06)");
    shadowPoly.setAttribute("stroke-width", "40");
    shadowPoly.setAttribute("filter", "url(#inner-shadow-blur)");
    svg.appendChild(shadowPoly);

    poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.id = "hole-border-poly";
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke-width", "3");
    svg.appendChild(poly);

    wrapper.appendChild(svg);
  }

  svg.style.opacity = "1";
  poly!.setAttribute("stroke", accent);

  // ── Pre-computed smooth ragged tear ──
  const pts = 40;
  const noise: number[] = [];
  for (let i = 0; i < pts; i++) {
    noise.push(((Math.random() - 0.5) * 12 + (Math.random() - 0.5) * 12) / 2);
  }

  const smNoise: number[] = [];
  for (let i = 0; i < pts; i++) {
    const p = noise[(i - 1 + pts) % pts];
    const c = noise[i];
    const n = noise[(i + 1) % pts];
    smNoise.push((p + c * 2 + n) / 4);
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = originX;
  const cy = originY;
  const cornerR =
    Math.sqrt(
      Math.pow(Math.max(cx, vw - cx), 2) + Math.pow(Math.max(cy, vh - cy), 2),
    ) + 40;

  const cosA: number[] = [];
  const sinA: number[] = [];
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    cosA.push(Math.cos(a));
    sinA.push(Math.sin(a));
  }

  const del: number[] = [];
  for (let i = 0; i < pts; i++) {
    let d = Math.pow(Math.sin((i / pts) * Math.PI * 5) * 0.5 + 0.5, 1.5) * 180;
    d += (Math.random() - 0.5) * 30;
    del.push(d < 0 ? 0 : d);
  }

  const DUR = 550;
  const TOTAL_FRAMES = 38;

  const frames: { css: string; svg: string }[] = [];
  const frameInterval = DUR / TOTAL_FRAMES;
  for (let f = 0; f <= TOTAL_FRAMES; f++) {
    const t = f * frameInterval;
    const cssPts: string[] = [];
    const svgPts: string[] = [];
    for (let i = 0; i < pts; i++) {
      const progress = Math.max(0, Math.min(1, (t - del[i]) / DUR));
      const eased = 1 - Math.pow(1 - progress, 3);
      let rad = eased * cornerR;
      if (rad > 15) rad += smNoise[i];
      const px = cx + cosA[i] * rad;
      const py = cy + sinA[i] * rad;
      cssPts.push(
        ((px / vw) * 100).toFixed(2) +
          "% " +
          ((py / vh) * 100).toFixed(2) +
          "%",
      );
      svgPts.push(px.toFixed(1) + "," + py.toFixed(1));
    }
    frames.push({
      css: "polygon(" + cssPts.join(", ") + ")",
      svg: svgPts.join(" "),
    });
  }

  // ── Run animation, then redirect ──
  function startHoleAnimation() {
    const startTime = performance.now();
    function loop(now: number) {
      const elapsed = now - startTime;
      const idx = Math.min(TOTAL_FRAMES, Math.floor(elapsed / frameInterval));
      const shape = frames[idx];
      wrapper!.style.clipPath = shape.css;
      poly!.setAttribute("points", shape.svg);
      shadowPoly!.setAttribute("points", shape.svg);
      if (idx >= TOTAL_FRAMES) {
        svg!.style.opacity = "0";
        wrapper!.style.clipPath = "none";
        window.location.href = targetUrl;
        return;
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  // Start immediately — no iframe to wait for
  setTimeout(startHoleAnimation, 80);
}
