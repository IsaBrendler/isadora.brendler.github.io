/* Drag and drop Ã¢â‚¬â€ positions relative to viewport */
const canvas = document.getElementById("canvas");
let zTop = 10;
let activeDrag = null;

/* Clock dial 10:00 Ã¢â€ â€™ 2:00 (12 = 0Ã‚Â°, each minute = 0.5Ã‚Â°) Ã¢â€ â€™ -60Ã‚Â° to +60Ã‚Â° */
const ROTATION_MIN = -60;
const ROTATION_MAX = 60;
const CLOCK_SPAN_MINUTES = 4 * 60;

const STRAIGHT_ROTATION_IDS = new Set(["archive", "numo", "wwdc24"]);

function randomRotation() {
  const offsetMinutes = Math.floor(Math.random() * (CLOCK_SPAN_MINUTES + 1));
  return ROTATION_MIN + offsetMinutes * 0.5;
}

function isStraightRotation(item) {
  return STRAIGHT_ROTATION_IDS.has(item.dataset.id);
}

function clampRotation(deg) {
  return Math.min(ROTATION_MAX, Math.max(ROTATION_MIN, deg));
}

function applyRotation(item, deg) {
  const rounded = Math.round(clampRotation(deg) * 2) / 2;
  item.style.setProperty("--rotate", `${rounded}deg`);
}

const ROTATION_CLOCK_KEY = "canvas-rotation-clock-10-2";

function initRotations() {
  document.querySelectorAll(".draggable").forEach((item) => {
    applyRotation(item, 0);
  });
}

const DRAG_THRESHOLD = 8;
const SAFE_MARGIN = 24;
const MOBILE_BREAKPOINT = 768;

function isMobile() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

function positionsKey() {
  return isMobile() ? "canvas-positions-mobile-v1" : "canvas-positions-v5";
}

function getCanvasRect() {
  return canvas.getBoundingClientRect();
}

function setItemPosition(item, clientX, clientY, offsetX, offsetY) {
  const canvasRect = getCanvasRect();
  item.style.left = `${clientX - canvasRect.left - offsetX}px`;
  item.style.top = `${clientY - canvasRect.top - offsetY}px`;
}

function rectsOverlap(a, b, padding = 0) {
  return !(
    a.right < b.left - padding ||
    a.left > b.right + padding ||
    a.bottom < b.top - padding ||
    a.top > b.bottom + padding
  );
}

function getSidebarRect() {
  return document.querySelector(".sidebar")?.getBoundingClientRect() ?? null;
}

function isOverlappingSidebar(item) {
  const sidebar = getSidebarRect();
  if (!sidebar) return false;
  return rectsOverlap(item.getBoundingClientRect(), sidebar, 12);
}

function getSafeBounds(item) {
  const sidebar = getSidebarRect();
  const w = item.offsetWidth;
  const h = item.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let minX = SAFE_MARGIN;
  let maxX = vw - w - SAFE_MARGIN;
  let minY = SAFE_MARGIN;
  let maxY = vh - h - SAFE_MARGIN;

  if (sidebar) {
    const sidebarOnLeft = sidebar.width < vw * 0.55;

    if (sidebarOnLeft) {
      minX = Math.max(minX, sidebar.right + SAFE_MARGIN);
    } else {
      minY = Math.max(minY, sidebar.bottom + SAFE_MARGIN);
    }
  }

  maxX = Math.max(minX, maxX);
  maxY = Math.max(minY, maxY);

  return { minX, maxX, minY, maxY };
}

function randomPositionOutsideSidebar(item) {
  const { minX, maxX, minY, maxY } = getSafeBounds(item);
  const canvasRect = getCanvasRect();
  return {
    x: minX - canvasRect.left + Math.random() * (maxX - minX),
    y: minY - canvasRect.top + Math.random() * (maxY - minY),
  };
}

function layoutMobileCarousel() {
  // CSS handles all positioning via flex + scroll-snap.
  // Just reset any inline styles that desktop may have set.
  document.querySelectorAll(".draggable").forEach((item) => {
    item.style.left = "";
    item.style.top = "";
  });

  // Sync dots if present
  updateCarouselDots();
}

function relocateIfOverSidebar(item) {
  if (!isOverlappingSidebar(item)) return false;

  if (isMobile()) {
    layoutMobileCarousel();
  } else {
    const { x, y } = randomPositionOutsideSidebar(item);
    item.style.left = `${x}px`;
    item.style.top = `${y}px`;
  }

  return true;
}

document.querySelectorAll(".draggable").forEach((item) => {
  let offsetX = 0;
  let offsetY = 0;
  let startX = 0;
  let startY = 0;
  let isDragging = false;

  item.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (isMobile()) return;
    activeDrag = item;
    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;
    item.setPointerCapture(e.pointerId);

    const rect = item.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
  });

  item.addEventListener("pointermove", (e) => {
    if (activeDrag !== item) return;
    if (isMobile()) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!isDragging && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      isDragging = true;
      item.classList.add("is-dragging");
      zTop += 1;
      item.style.zIndex = String(zTop);
    }

    if (!isDragging) return;

    setItemPosition(item, e.clientX, e.clientY, offsetX, offsetY);
  });

  const endPointer = (e) => {
    if (activeDrag !== item) return;

    if (isDragging) {
      item.classList.remove("is-dragging");
      relocateIfOverSidebar(item);
      savePositions();
    } else {
      const href = item.dataset.href;
      if (href) {
        if (href.startsWith("http")) {
          window.open(href, "_blank");
        } else {
          window.location.href = href;
        }
      }
    }

    activeDrag = null;
    isDragging = false;
    try {
      item.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  item.addEventListener("pointerup", endPointer);
  item.addEventListener("pointercancel", endPointer);
});

function savePositions() {}
function loadPositions() { return false; }

initRotations();

function convertPercentagesToPixels() {
  document.querySelectorAll(".draggable").forEach((item) => {
    const canvasRect = getCanvasRect();
    const rect = item.getBoundingClientRect();
    item.style.left = `${rect.left - canvasRect.left}px`;
    item.style.top = `${rect.top - canvasRect.top}px`;
  });
}

let wasMobile = isMobile();
window.addEventListener("resize", () => {
  const mobile = isMobile();
  if (mobile === wasMobile) return;
  wasMobile = mobile;

  if (mobile) {
    layoutMobileCarousel();
  } else {
    // Reset inline coordinates to let default % coordinates adjust
    document.querySelectorAll(".draggable").forEach((item) => {
      item.style.left = "";
      item.style.top = "";
    });
    convertPercentagesToPixels();
  }
});

/* Nav filter */
document.querySelectorAll(".nav__link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const filter = link.dataset.filter;

    document.querySelectorAll(".nav__link").forEach((l) => l.classList.remove("is-active"));
    link.classList.add("is-active");

    document.querySelectorAll(".draggable").forEach((item) => {
      const categories = (item.dataset.category || "").split(" ");
      const match = filter === "all" || categories.includes(filter);
      item.classList.toggle("is-dimmed", !match);

      // On mobile: actually hide/show so carousel only shows matching items
      if (isMobile()) {
        item.style.display = match ? "" : "none";
      }
    });

    // Rebuild dots after filter changes
    if (isMobile()) {
      rebuildCarouselDots();
      canvas.scrollLeft = 0;
    }
  });
});

/* Copy email */
const copyBtn = document.getElementById("copy-email");
const toast = document.getElementById("copy-toast");
const email = "brendlerisadora@gmail.com";

copyBtn?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(email);
    toast?.classList.add("is-visible");
    setTimeout(() => toast?.classList.remove("is-visible"), 2000);
  } catch (_) {
    window.prompt("Copy email:", email);
  }
});

/* Convert % initial positions to px on first load (desktop only) */
window.addEventListener("load", () => {
  if (isMobile()) {
    initCarouselDots();
    layoutMobileCarousel();
    return;
  }
  convertPercentagesToPixels();
});

/* ===== CAROUSEL DOTS ===== */
function initCarouselDots() {
  if (!isMobile()) return;
  rebuildCarouselDots();

  canvas.addEventListener("scroll", () => {
    updateCarouselDots();
  }, { passive: true });
}

function rebuildCarouselDots() {
  let dotsEl = document.querySelector(".carousel-dots");
  if (!dotsEl) {
    dotsEl = document.createElement("div");
    dotsEl.className = "carousel-dots";
    document.body.appendChild(dotsEl);
  }

  const items = [...document.querySelectorAll(".draggable:not([style*='display: none'])")];
  dotsEl.innerHTML = items.map((_, i) =>
    `<div class="carousel-dot${i === 0 ? " is-active" : ""}"></div>`
  ).join("");
}

function updateCarouselDots() {
  if (!isMobile()) return;
  const dotsEl = document.querySelector(".carousel-dots");
  if (!dotsEl) return;

  const items = [...document.querySelectorAll(".draggable:not([style*='display: none'])")];
  const dots = [...dotsEl.querySelectorAll(".carousel-dot")];
  const canvasCenter = canvas.scrollLeft + canvas.clientWidth / 2;

  let closestIdx = 0;
  let minDist = Infinity;
  items.forEach((item, i) => {
    const itemCenter = item.offsetLeft + item.offsetWidth / 2;
    const dist = Math.abs(itemCenter - canvasCenter);
    if (dist < minDist) { minDist = dist; closestIdx = i; }
  });

  dots.forEach((dot, i) => dot.classList.toggle("is-active", i === closestIdx));
}
