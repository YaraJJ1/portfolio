import { db } from "./firebase.js";
import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

/* =========================================================
   Lookup tables
   ========================================================= */

const CATEGORY_LABELS = {
    games: "Game Dev",
    web: "Web",
    backend: "Back-end",
    others: "Other"
};

const DIFFICULTY_ORDER = { easy: 1, medium: 2, hard: 3 };

// Dot colour + display label for each technology tag.
const TECH = {
    html:       { label: "HTML",       color: "#e3704f" },
    css:        { label: "CSS",        color: "#5f7be9" },
    js:         { label: "JavaScript", color: "#e8c94a" },
    javascript: { label: "JavaScript", color: "#e8c94a" },
    ts:         { label: "TypeScript", color: "#3178c6" },
    typescript: { label: "TypeScript", color: "#3178c6" },
    java:       { label: "Java",       color: "#b07219" },
    "c++":      { label: "C++",        color: "#f34b7d" },
    "c#":       { label: "C#",         color: "#8f6ce0" },
    python:     { label: "Python",     color: "#3776ab" },
    unity:      { label: "Unity",      color: "#9aa3ad" },
    php:        { label: "PHP",        color: "#777bb4" },
    sql:        { label: "SQL",        color: "#e38c00" },
    hlsl:       { label: "HLSL",       color: "#5cc99a" }
};

const PLACEHOLDER_IMG = "images.png";

/* =========================================================
   State
   ========================================================= */

let allProjects = [];
let visibleProjects = [];

const state = {
    category: "all",
    difficulties: new Set(),
    query: "",
    sort: "new-old"
};

/* =========================================================
   Element references
   ========================================================= */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const grid = $("#projectGrid");
const emptyState = $("#emptyState");
const resultCount = $("#resultCount");
const tabsEl = $("#categoryTabs");
const tabIndicator = $(".tab-indicator", tabsEl);
const searchInput = $("#searchInput");
const sortSelect = $("#sortSelect");
const chips = $$(".chip[data-difficulty]");
const modal = $("#projectModal");
const toastEl = $("#toast");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* =========================================================
   Helpers
   ========================================================= */

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Dates are stored as dd/mm/yyyy.
function parseDate(str) {
    if (!str) return new Date(0);
    const [day, month, year] = str.split("/").map(Number);
    const d = new Date(year, (month || 1) - 1, day || 1);
    return isNaN(d) ? new Date(0) : d;
}

function formatDate(date, long = false) {
    if (!date || date.getTime() === 0) return "";
    return date.toLocaleDateString("en-GB", long
        ? { day: "numeric", month: "long", year: "numeric" }
        : { month: "short", year: "numeric" });
}

function techInfo(key) {
    return TECH[key] || { label: key.toUpperCase(), color: "#8f8893" };
}

function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

function difficultyHTML(level) {
    if (!level) return "";
    return `<span class="difficulty" data-level="${escapeHTML(level)}">
        <span class="bars" aria-hidden="true"><i></i><i></i><i></i></span>${escapeHTML(capitalize(level))}
    </span>`;
}

function techListHTML(techs) {
    return techs.map(t => {
        const info = techInfo(t);
        return `<li class="tech" style="--dot:${info.color}">${escapeHTML(info.label)}</li>`;
    }).join("");
}

let toastTimer;
function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

/* =========================================================
   Data loading
   ========================================================= */

function normalizeProject(id, data) {
    // Each project can have a "media" array (images and/or videos). Falls back
    // to the older "images" (url-only) and "imgSrc" fields so old docs still work.
    let media = Array.isArray(data.media) && data.media.length
        ? data.media
        : (Array.isArray(data.images) && data.images.length
            ? data.images.map(url => ({ url, type: "image" }))
            : [{ url: data.imgSrc || PLACEHOLDER_IMG, type: "image" }]);

    media = media.filter(m => m && m.url);

    const firstImage = media.find(m => m.type !== "video");
    const firstVideo = media.find(m => m.type === "video");
    const techs = (data["code-language"] || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    const date = parseDate(data["data-date"]);

    return {
        id,
        title: data.imgTxt || "Untitled project",
        summary: data.imgDesc || "",
        descriptionHTML: data.imgMoreDesc || "", // rich text written in the admin editor
        category: data["data-category"] || "others",
        difficulty: data["data-difficulty"] || "",
        date,
        techs,
        media,
        thumb: firstImage ? firstImage.url : PLACEHOLDER_IMG,
        previewVideo: firstVideo ? firstVideo.url : "",
        githubLink: data.githubLink || "",
        searchText: [
            data.imgTxt, data.imgDesc, data["data-category"],
            CATEGORY_LABELS[data["data-category"]],
            ...techs.map(t => techInfo(t).label), ...techs
        ].join(" ").toLowerCase()
    };
}

async function loadProjects() {
    try {
        const snapshot = await getDocs(collection(db, "projects"));
        allProjects = snapshot.docs.map(doc => normalizeProject(doc.id, doc.data()));
    } catch (error) {
        console.error("Error loading projects:", error);
        grid.innerHTML = "";
        emptyState.hidden = false;
        $("h2", emptyState).textContent = "Projects couldn't be loaded";
        $("p", emptyState).textContent = "Please check your connection and try again.";
        const btn = $("#clearFilters");
        btn.textContent = "Reload";
        btn.onclick = () => location.reload();
        return;
    }

    updateStats();
    updateTabCounts();
    render();
    openFromHash();
}

/* =========================================================
   Stats & counts
   ========================================================= */

function animateCount(el, target) {
    if (prefersReducedMotion || target === 0) { el.textContent = target; return; }
    const duration = 1100;
    const start = performance.now();
    const step = now => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased);
        if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function updateStats() {
    const techs = new Set(allProjects.flatMap(p => p.techs.map(t => techInfo(t).label)));
    const latest = allProjects.reduce((max, p) => (p.date > max ? p.date : max), new Date(0));

    animateCount($('[data-stat="total"]'), allProjects.length);
    animateCount($('[data-stat="games"]'), allProjects.filter(p => p.category === "games").length);
    animateCount($('[data-stat="tech"]'), techs.size);
    $('[data-stat="latest"]').textContent = formatDate(latest) || "—";
}

function updateTabCounts() {
    $$(".tab", tabsEl).forEach(tab => {
        const key = tab.dataset.filter;
        const count = key === "all"
            ? allProjects.length
            : allProjects.filter(p => p.category === key).length;
        $(".tab-count", tab).textContent = count;
        tab.classList.toggle("is-empty", count === 0);
    });
    moveTabIndicator(); // counts change tab widths
}

/* =========================================================
   Filtering, sorting, rendering
   ========================================================= */

function getVisibleProjects() {
    const q = state.query.trim().toLowerCase();
    const list = allProjects.filter(p =>
        (state.category === "all" || p.category === state.category) &&
        (state.difficulties.size === 0 || state.difficulties.has(p.difficulty)) &&
        (!q || q.split(/\s+/).every(word => p.searchText.includes(word)))
    );

    const diff = p => DIFFICULTY_ORDER[p.difficulty] || 0;
    const sorters = {
        "new-old": (a, b) => b.date - a.date,
        "old-new": (a, b) => a.date - b.date,
        "high-low": (a, b) => diff(b) - diff(a) || b.date - a.date,
        "low-high": (a, b) => diff(a) - diff(b) || b.date - a.date
    };
    return list.sort(sorters[state.sort] || sorters["new-old"]);
}

function cardHTML(p, index) {
    const imageCount = p.media.filter(m => m.type !== "video").length;
    const videoCount = p.media.length - imageCount;
    const mediaParts = [];
    if (imageCount) mediaParts.push(`${imageCount} image${imageCount > 1 ? "s" : ""}`);
    if (videoCount) mediaParts.push(`${videoCount} video${videoCount > 1 ? "s" : ""}`);

    return `
    <li>
        <article class="card" tabindex="0" role="button" data-id="${escapeHTML(p.id)}"
                 style="--i:${Math.min(index, 8)}" aria-label="View details: ${escapeHTML(p.title)}">
            <div class="card-media">
                <img src="${escapeHTML(p.thumb)}" alt="" loading="lazy" decoding="async">
                ${p.previewVideo ? `<video muted loop playsinline preload="none" data-src="${escapeHTML(p.previewVideo)}"></video>` : ""}
                <div class="card-badges">
                    <span class="badge">${escapeHTML(CATEGORY_LABELS[p.category] || capitalize(p.category))}</span>
                    ${p.previewVideo ? `<span class="badge"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.8v8.4L10 6z"/></svg>Video</span>` : ""}
                </div>
            </div>
            <div class="card-body">
                <div class="card-meta">
                    <time datetime="${p.date.toISOString().slice(0, 10)}">${escapeHTML(formatDate(p.date))}</time>
                    ${difficultyHTML(p.difficulty)}
                </div>
                <h3 class="card-title">${escapeHTML(p.title)}</h3>
                <p class="card-desc">${escapeHTML(p.summary)}</p>
                <ul class="tech-list">${techListHTML(p.techs)}</ul>
                <div class="card-footer">
                    <span class="card-cta">View project
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </span>
                    <span class="card-media-count">${mediaParts.join(" · ")}</span>
                </div>
            </div>
        </article>
    </li>`;
}

function render() {
    visibleProjects = getVisibleProjects();

    grid.innerHTML = visibleProjects.map(cardHTML).join("");
    emptyState.hidden = visibleProjects.length > 0;

    const total = allProjects.length;
    resultCount.innerHTML = visibleProjects.length === total
        ? `Showing all <strong>${total}</strong> project${total === 1 ? "" : "s"}`
        : `Showing <strong>${visibleProjects.length}</strong> of ${total} projects`;

    $$(".card", grid).forEach(attachCardInteractions);
}

/* =========================================================
   Card interactions: tilt, spotlight, hover video preview
   ========================================================= */

function attachCardInteractions(card) {
    card.addEventListener("click", () => openModal(card.dataset.id));
    card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openModal(card.dataset.id);
        }
    });

    if (!canHover) return;

    const video = $("video", card);

    card.addEventListener("pointerenter", () => {
        if (!video) return;
        if (!video.src) video.src = video.dataset.src;
        video.play().then(() => card.classList.add("previewing")).catch(() => {});
    });

    card.addEventListener("pointermove", e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty("--mx", `${x}px`);
        card.style.setProperty("--my", `${y}px`);
        if (prefersReducedMotion) return;
        const rx = ((y / rect.height) - 0.5) * -6;
        const ry = ((x / rect.width) - 0.5) * 6;
        card.classList.add("tilting");
        card.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
        card.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
    });

    card.addEventListener("pointerleave", () => {
        card.classList.remove("tilting", "previewing");
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
        if (video) video.pause();
    });
}

/* =========================================================
   Toolbar controls
   ========================================================= */

function moveTabIndicator() {
    const active = $(".tab.active", tabsEl);
    if (!active) return;
    tabIndicator.style.width = `${active.offsetWidth}px`;
    tabIndicator.style.transform = `translateX(${active.offsetLeft}px)`;
}

$$(".tab", tabsEl).forEach(tab => {
    tab.addEventListener("click", () => {
        $$(".tab", tabsEl).forEach(t => {
            t.classList.toggle("active", t === tab);
            t.setAttribute("aria-selected", t === tab);
        });
        state.category = tab.dataset.filter;
        moveTabIndicator();
        tab.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
        render();
    });
});

chips.forEach(chip => {
    chip.addEventListener("click", () => {
        const level = chip.dataset.difficulty;
        const pressed = chip.getAttribute("aria-pressed") === "true";
        chip.setAttribute("aria-pressed", String(!pressed));
        pressed ? state.difficulties.delete(level) : state.difficulties.add(level);
        render();
    });
});

searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    render();
});

sortSelect.addEventListener("change", () => {
    state.sort = sortSelect.value;
    render();
});

$("#clearFilters").addEventListener("click", () => {
    state.query = "";
    state.difficulties.clear();
    searchInput.value = "";
    chips.forEach(c => c.setAttribute("aria-pressed", "false"));
    $('.tab[data-filter="all"]', tabsEl).click();
});

// "/" focuses search (like GitHub), unless you're already typing somewhere.
document.addEventListener("keydown", e => {
    if (e.key === "/" && !modal.classList.contains("open") &&
        !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        searchInput.focus();
    }
});

/* =========================================================
   Project modal
   ========================================================= */

let modalSwiper = null;
let currentId = null;
let lastFocused = null;

const modalEls = {
    swiperEl: $("#modalSwiper"),
    wrapper: $("#modalSwiper .swiper-wrapper"),
    category: $("#modalCategory"),
    difficulty: $("#modalDifficulty"),
    date: $("#modalDate"),
    title: $("#modalTitle"),
    summary: $("#modalSummary"),
    tech: $("#modalTech"),
    github: $("#modalGithub"),
    description: $("#modalDescription"),
    body: $(".modal-body", modal),
    prev: $("#modalPrev"),
    next: $("#modalNext")
};

function renderSlides(media) {
    const { swiperEl, wrapper } = modalEls;

    wrapper.innerHTML = media.map(item => item.type === "video"
        ? `<div class="swiper-slide"><video src="${escapeHTML(item.url)}" controls playsinline preload="metadata"></video></div>`
        : `<div class="swiper-slide"><img src="${escapeHTML(item.url)}" alt=""></div>`
    ).join("");

    if (modalSwiper) {
        modalSwiper.destroy(true, true);
        modalSwiper = null;
    }

    if (typeof Swiper === "undefined") return;

    const hasVideo = media.some(item => item.type === "video");
    const multiple = media.length > 1;

    modalSwiper = new Swiper(swiperEl, {
        loop: multiple,
        keyboard: { enabled: true },
        grabCursor: multiple,
        // No autoplay when there's a video, so it never swipes away from a clip being watched.
        autoplay: multiple && !hasVideo && !prefersReducedMotion
            ? { delay: 3500, disableOnInteraction: true }
            : false,
        pagination: {
            el: swiperEl.querySelector(".swiper-pagination"),
            clickable: true,
            renderBullet: (index, className) => {
                const isVideo = media[index] && media[index].type === "video";
                return `<span class="${className}${isVideo ? " swiper-pagination-bullet-video" : ""}"></span>`;
            }
        },
        navigation: {
            nextEl: swiperEl.querySelector(".swiper-button-next"),
            prevEl: swiperEl.querySelector(".swiper-button-prev")
        },
        on: {
            slideChangeTransitionStart() {
                swiperEl.querySelectorAll("video").forEach(v => v.pause());
            }
        }
    });

    const showNav = multiple ? "" : "none";
    swiperEl.querySelectorAll(".swiper-button-prev, .swiper-button-next, .swiper-pagination")
        .forEach(el => (el.style.display = showNav));
}

function fillModal(project) {
    const m = modalEls;
    currentId = project.id;

    renderSlides(project.media.length ? project.media : [{ url: PLACEHOLDER_IMG, type: "image" }]);

    m.category.textContent = CATEGORY_LABELS[project.category] || capitalize(project.category);
    m.difficulty.outerHTML = difficultyHTML(project.difficulty).replace('class="difficulty"', 'class="difficulty" id="modalDifficulty"') ||
        '<span class="difficulty" id="modalDifficulty"></span>';
    m.difficulty = $("#modalDifficulty");
    m.date.textContent = formatDate(project.date, true);
    m.title.textContent = project.title;
    m.summary.textContent = project.summary;
    m.summary.hidden = !project.summary;
    m.tech.innerHTML = techListHTML(project.techs);
    // Rich text from the admin editor (line breaks, bold, underline) is kept as HTML.
    m.description.innerHTML = project.descriptionHTML || "<em>More details coming soon.</em>";

    if (project.githubLink) {
        m.github.href = project.githubLink;
        m.github.hidden = false;
    } else {
        m.github.removeAttribute("href");
        m.github.hidden = true;
    }

    // Prev / next within whatever is currently filtered on the page.
    const list = visibleProjects.some(p => p.id === project.id) ? visibleProjects : allProjects;
    const idx = list.findIndex(p => p.id === project.id);
    const prev = list[idx - 1];
    const next = list[idx + 1];
    setNavButton(m.prev, prev);
    setNavButton(m.next, next);

    m.body.scrollTop = 0;
    $(".modal-panel", modal).scrollTop = 0;
}

function setNavButton(btn, project) {
    btn.disabled = !project;
    btn.dataset.target = project ? project.id : "";
    $("strong", btn).textContent = project ? project.title : "—";
}

function openModal(id) {
    const project = allProjects.find(p => p.id === id);
    if (!project) return;

    if (!modal.classList.contains("open")) {
        lastFocused = document.activeElement;
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
        setTimeout(() => $(".modal-close", modal).focus({ preventScroll: true }), 50);
    }

    fillModal(project);
    history.replaceState(null, "", `#project=${encodeURIComponent(id)}`);
}

function closeModal() {
    if (!modal.classList.contains("open")) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    modalEls.swiperEl.querySelectorAll("video").forEach(v => v.pause());
    if (modalSwiper && modalSwiper.autoplay) modalSwiper.autoplay.stop();
    history.replaceState(null, "", location.pathname + location.search);
    currentId = null;
    if (lastFocused && document.body.contains(lastFocused)) lastFocused.focus({ preventScroll: true });
}

function openFromHash() {
    const match = location.hash.match(/^#project=(.+)$/);
    if (match) openModal(decodeURIComponent(match[1]));
}

$$("[data-close]", modal).forEach(el => el.addEventListener("click", closeModal));

[modalEls.prev, modalEls.next].forEach(btn => {
    btn.addEventListener("click", () => {
        if (btn.dataset.target) openModal(btn.dataset.target);
    });
});

$("#modalShare").addEventListener("click", async () => {
    const url = `${location.origin}${location.pathname}#project=${encodeURIComponent(currentId)}`;
    try {
        await navigator.clipboard.writeText(url);
        showToast("Link copied to clipboard");
    } catch {
        showToast(url);
    }
});

document.addEventListener("keydown", e => {
    if (!modal.classList.contains("open")) return;

    if (e.key === "Escape") {
        closeModal();
        return;
    }

    // Keep keyboard focus inside the dialog.
    if (e.key === "Tab") {
        const focusables = $$('a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])', $(".modal-panel", modal))
            .filter(el => el.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
});

window.addEventListener("hashchange", openFromHash);

/* =========================================================
   Page chrome: header, theme, menu, progress, back-to-top
   ========================================================= */

const header = $("#siteHeader");
const toTop = $("#toTop");
const progressBar = $(".scroll-progress");

function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle("scrolled", y > 10);
    toTop.classList.toggle("show", y > 600);
    progressBar.style.setProperty("--progress", max > 0 ? (y / max).toFixed(4) : 0);
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" }));

$("#themeToggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    $('meta[name="theme-color"]').setAttribute("content", next === "light" ? "#efede4" : "#120e13");
    try { localStorage.setItem("theme", next); } catch {}
});

const menuToggle = $("#menuToggle");
const siteNav = $("#siteNav");
menuToggle.addEventListener("click", () => {
    const open = siteNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
});
document.addEventListener("click", e => {
    if (siteNav.classList.contains("open") && !siteNav.contains(e.target) && !menuToggle.contains(e.target)) {
        siteNav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
    }
});

$("#year").textContent = new Date().getFullYear();

window.addEventListener("resize", moveTabIndicator);
document.fonts?.ready.then(moveTabIndicator);
moveTabIndicator();

loadProjects();
