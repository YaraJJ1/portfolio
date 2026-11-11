import { db } from "./firebase.js";
import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const CATEGORY_LABELS = {
    games: "Games",
    web: "Web",
    backend: "Back-end",
    others: "Other"
};

const DIFFICULTY_ORDER = { easy: 1, medium: 2, hard: 3 };

// Label + tag colour for each technology.
const TECH = {
    html:       { label: "HTML",       color: "#dd7156" },
    css:        { label: "CSS",        color: "#5f7be9" },
    js:         { label: "JavaScript", color: "#b8961a" },
    javascript: { label: "JavaScript", color: "#b8961a" },
    ts:         { label: "TypeScript", color: "#3178c6" },
    typescript: { label: "TypeScript", color: "#3178c6" },
    java:       { label: "Java",       color: "#866aa5" },
    "c++":      { label: "C++",        color: "#ae759f" },
    "c#":       { label: "C#",         color: "#439775" },
    python:     { label: "Python",     color: "#3776ab" },
    unity:      { label: "Unity",      color: "#4b4b55" },
    php:        { label: "PHP",        color: "#486552" },
    sql:        { label: "SQL",        color: "#c47a66" },
    hlsl:       { label: "HLSL",       color: "#77659a" }
};

const CATEGORY_COLORS = {
    games: "#2f7f86",
    web: "#4a6fc0",
    backend: "#8a5a3c",
    others: "#7a6f7c"
};

const PLACEHOLDER_IMG = "images.png";

let allProjects = [];
let visibleProjects = [];

const state = {
    category: "all",
    difficulties: new Set(),
    query: "",
    sort: "new-old"
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const grid = $("#projectGrid");
const loading = $("#loading");
const emptyState = $("#emptyState");
const searchInput = $("#searchInput");
const levelDropdown = $("#levelDropdown");
const sortDropdown = $("#sortDropdown");
const levelBoxes = $$("input[type=checkbox]", levelDropdown);
const sortOptions = $$(".dd-option", sortDropdown);
const modal = $("#projectModal");
const toastEl = $("#toast");

const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ---------- Helpers ---------- */

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
        : { month: "long", year: "numeric" });
}

const techLabel = key => (TECH[key] ? TECH[key].label : key.toUpperCase());
const capitalize = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

function tag(text, color, extraClass = "") {
    return `<span class="tag ${extraClass}" style="--tag:${color}">${escapeHTML(text)}</span>`;
}

// Difficulty shown as signal bars (1 = easy, 2 = medium, 3 = hard).
function levelTag(p) {
    if (!p.difficulty) return "";
    const label = capitalize(p.difficulty);
    return `<span class="level level-${escapeHTML(p.difficulty)}" title="${escapeHTML(label)} difficulty">
        <span class="signal" aria-hidden="true"><i></i><i></i><i></i></span>${escapeHTML(label)}
    </span>`;
}

function tagsHTML(p) {
    const category = tag(CATEGORY_LABELS[p.category] || capitalize(p.category), CATEGORY_COLORS[p.category] || "#7a6f7c", "category");
    const techs = p.techs.map(t => tag(techLabel(t), TECH[t] ? TECH[t].color : "#6f6873")).join("");
    return category + techs;
}

let toastTimer;
function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2000);
}

/* ---------- Loading ---------- */

function normalizeProject(id, data) {
    // "media" holds images and videos; older docs used "images" or "imgSrc".
    let media = Array.isArray(data.media) && data.media.length
        ? data.media
        : (Array.isArray(data.images) && data.images.length
            ? data.images.map(url => ({ url, type: "image" }))
            : [{ url: data.imgSrc || PLACEHOLDER_IMG, type: "image" }]);
    media = media.filter(m => m && m.url);

    const firstImage = media.find(m => m.type !== "video");
    const firstVideo = media.find(m => m.type === "video");
    const techs = (data["code-language"] || "").trim().toLowerCase().split(/\s+/).filter(Boolean);

    return {
        id,
        title: data.imgTxt || "Untitled project",
        summary: data.imgDesc || "",
        descriptionHTML: data.imgMoreDesc || "",
        category: data["data-category"] || "others",
        difficulty: data["data-difficulty"] || "",
        date: parseDate(data["data-date"]),
        techs,
        media,
        thumb: firstImage ? firstImage.url : PLACEHOLDER_IMG,
        previewVideo: firstVideo ? firstVideo.url : "",
        githubLink: data.githubLink || "",
        searchText: [data.imgTxt, data.imgDesc, data["data-category"], ...techs, ...techs.map(techLabel)]
            .join(" ")
            .toLowerCase()
    };
}

async function loadProjects() {
    try {
        const snapshot = await getDocs(collection(db, "projects"));
        allProjects = snapshot.docs.map(doc => normalizeProject(doc.id, doc.data()));
    } catch (error) {
        console.error("Error loading projects:", error);
        loading.textContent = "Couldn't load projects. Please refresh the page.";
        return;
    }

    loading.hidden = true;
    writeSummary();
    render();
    openFromHash();
}

function writeSummary() {
    const counts = {};
    allProjects.forEach(p => (counts[p.category] = (counts[p.category] || 0) + 1));
    const parts = Object.keys(CATEGORY_LABELS)
        .filter(key => counts[key])
        .map(key => `${counts[key]} ${CATEGORY_LABELS[key].toLowerCase()}`);
    const total = allProjects.length;
    $("#summary").textContent = `${total} project${total === 1 ? "" : "s"}${parts.length ? ` (${parts.join(", ")})` : ""}`;
}

/* ---------- Filter, sort, render ---------- */

function getVisibleProjects() {
    const words = state.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = allProjects.filter(p =>
        (state.category === "all" || p.category === state.category) &&
        (state.difficulties.size === 0 || state.difficulties.has(p.difficulty)) &&
        words.every(w => p.searchText.includes(w))
    );

    const diff = p => DIFFICULTY_ORDER[p.difficulty] || 0;
    const sorters = {
        "new-old": (a, b) => b.date - a.date,
        "old-new": (a, b) => a.date - b.date,
        "high-low": (a, b) => diff(b) - diff(a) || b.date - a.date,
        "low-high": (a, b) => diff(a) - diff(b) || b.date - a.date
    };
    return list.sort(sorters[state.sort]);
}

function cardHTML(p) {
    return `
    <li>
        <article class="card" tabindex="0" role="button" data-id="${escapeHTML(p.id)}" aria-label="${escapeHTML(p.title)}">
            <div class="card-media">
                <img src="${escapeHTML(p.thumb)}" alt="" loading="lazy">
                ${p.previewVideo ? `<video muted loop playsinline preload="none" data-src="${escapeHTML(p.previewVideo)}"></video><span class="video-note">video</span>` : ""}
            </div>
            <div class="card-body">
                <div class="card-head">
                    <h3 class="card-title">${escapeHTML(p.title)}</h3>
                    ${levelTag(p)}
                </div>
                <p class="card-date">${escapeHTML(formatDate(p.date))}</p>
                <p class="card-desc">${escapeHTML(p.summary)}</p>
                <div class="tags">${tagsHTML(p)}</div>
            </div>
        </article>
    </li>`;
}

function render() {
    visibleProjects = getVisibleProjects();
    grid.innerHTML = visibleProjects.map(cardHTML).join("");
    emptyState.hidden = visibleProjects.length > 0;
    $$(".card", grid).forEach(setUpCard);
}

function setUpCard(card) {
    card.addEventListener("click", () => openModal(card.dataset.id));
    card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openModal(card.dataset.id);
        }
    });

    // Play the project's video quietly while hovering, if it has one.
    const video = $("video", card);
    if (!video || !canHover) return;
    card.addEventListener("mouseenter", () => {
        if (!video.src) video.src = video.dataset.src;
        video.play().then(() => card.classList.add("previewing")).catch(() => {});
    });
    card.addEventListener("mouseleave", () => {
        card.classList.remove("previewing");
        video.pause();
    });
}

/* ---------- Controls ---------- */

$$(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        $$(".tab").forEach(t => {
            t.classList.toggle("active", t === tab);
            t.setAttribute("aria-selected", String(t === tab));
        });
        state.category = tab.dataset.filter;
        render();
    });
});

/* Dropdown menus (Difficulty, Sort) */
const dropdowns = [levelDropdown, sortDropdown];

function closeDropdowns(except) {
    dropdowns.forEach(dd => {
        if (dd === except) return;
        dd.classList.remove("open");
        $(".dd-btn", dd).setAttribute("aria-expanded", "false");
    });
}

dropdowns.forEach(dd => {
    $(".dd-btn", dd).addEventListener("click", () => {
        const open = !dd.classList.contains("open");
        closeDropdowns(dd);
        dd.classList.toggle("open", open);
        $(".dd-btn", dd).setAttribute("aria-expanded", String(open));
    });
});

document.addEventListener("click", e => {
    if (!dropdowns.some(dd => dd.contains(e.target))) closeDropdowns();
});

function updateLevelCount() {
    const count = $(".dd-count", levelDropdown);
    count.textContent = state.difficulties.size;
    count.hidden = state.difficulties.size === 0;
    levelDropdown.classList.toggle("active", state.difficulties.size > 0);
}

levelBoxes.forEach(box => {
    box.addEventListener("change", () => {
        box.checked ? state.difficulties.add(box.value) : state.difficulties.delete(box.value);
        updateLevelCount();
        render();
    });
});

function setSort(value) {
    state.sort = value;
    sortOptions.forEach(o => o.setAttribute("aria-checked", String(o.dataset.sort === value)));
    const chosen = sortOptions.find(o => o.dataset.sort === value);
    $("#sortLabel").textContent = chosen ? chosen.textContent : "";
    render();
}

sortOptions.forEach(option => {
    option.addEventListener("click", () => {
        setSort(option.dataset.sort);
        closeDropdowns();
    });
});

searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    render();
});

$("#clearFilters").addEventListener("click", () => {
    state.query = "";
    state.difficulties.clear();
    searchInput.value = "";
    levelBoxes.forEach(b => (b.checked = false));
    updateLevelCount();
    $('.tab[data-filter="all"]').click();
});

/* ---------- Popup ---------- */

let modalSwiper = null;
let currentId = null;
let lastFocused = null;

const swiperEl = $("#modalSwiper");

function renderSlides(media) {
    $(".swiper-wrapper", swiperEl).innerHTML = media.map(item => item.type === "video"
        ? `<div class="swiper-slide"><video src="${escapeHTML(item.url)}" controls playsinline preload="metadata"></video></div>`
        : `<div class="swiper-slide"><img src="${escapeHTML(item.url)}" alt=""></div>`
    ).join("");

    if (modalSwiper) {
        modalSwiper.destroy(true, true);
        modalSwiper = null;
    }
    if (typeof Swiper === "undefined") return;

    const multiple = media.length > 1;
    modalSwiper = new Swiper(swiperEl, {
        loop: multiple,
        keyboard: { enabled: true },
        pagination: { el: $(".swiper-pagination", swiperEl), clickable: true },
        navigation: {
            nextEl: $(".swiper-button-next", swiperEl),
            prevEl: $(".swiper-button-prev", swiperEl)
        },
        on: {
            slideChangeTransitionStart() {
                swiperEl.querySelectorAll("video").forEach(v => v.pause());
            }
        }
    });

    $$(".swiper-button-prev, .swiper-button-next, .swiper-pagination", swiperEl)
        .forEach(el => (el.style.display = multiple ? "" : "none"));
}

function fillModal(p) {
    currentId = p.id;
    renderSlides(p.media.length ? p.media : [{ url: PLACEHOLDER_IMG, type: "image" }]);

    $("#modalTitle").textContent = p.title;
    $("#modalMeta").textContent = formatDate(p.date, true);
    $("#modalTech").innerHTML = levelTag(p) + tagsHTML(p);
    // Written in the admin editor, so line breaks / bold / underline are kept.
    $("#modalDescription").innerHTML = p.descriptionHTML || escapeHTML(p.summary);

    const gh = $("#modalGithub");
    if (p.githubLink) {
        gh.href = p.githubLink;
        gh.hidden = false;
    } else {
        gh.removeAttribute("href");
        gh.hidden = true;
    }

    const list = visibleProjects.some(x => x.id === p.id) ? visibleProjects : allProjects;
    const i = list.findIndex(x => x.id === p.id);
    setNavButton($("#modalPrev"), list[i - 1]);
    setNavButton($("#modalNext"), list[i + 1]);

    $(".modal-panel", modal).scrollTop = 0;
}

function setNavButton(btn, project) {
    btn.hidden = !project;
    btn.dataset.target = project ? project.id : "";
    $("span", btn).textContent = project ? project.title : "";
}

function openModal(id) {
    const project = allProjects.find(p => p.id === id);
    if (!project) return;

    if (!modal.classList.contains("open")) {
        lastFocused = document.activeElement;
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
        $(".modal-close", modal).focus({ preventScroll: true });
    }

    fillModal(project);
    history.replaceState(null, "", `#project=${encodeURIComponent(id)}`);
}

function closeModal() {
    if (!modal.classList.contains("open")) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    swiperEl.querySelectorAll("video").forEach(v => v.pause());
    history.replaceState(null, "", location.pathname + location.search);
    currentId = null;
    if (lastFocused) lastFocused.focus({ preventScroll: true });
}

function openFromHash() {
    const match = location.hash.match(/^#project=(.+)$/);
    if (match) openModal(decodeURIComponent(match[1]));
}

$$("[data-close]", modal).forEach(el => el.addEventListener("click", closeModal));

["#modalPrev", "#modalNext"].forEach(sel => {
    $(sel).addEventListener("click", e => {
        const target = e.currentTarget.dataset.target;
        if (target) openModal(target);
    });
});

$("#modalShare").addEventListener("click", async () => {
    const url = `${location.origin}${location.pathname}#project=${encodeURIComponent(currentId)}`;
    try {
        await navigator.clipboard.writeText(url);
        showToast("Link copied");
    } catch {
        showToast(url);
    }
});

document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
        closeDropdowns();
        closeModal();
    }
});

window.addEventListener("hashchange", openFromHash);

/* ---------- Page ---------- */

const menuToggle = $("#menuToggle");
const siteNav = $("#siteNav");
menuToggle.addEventListener("click", () => {
    const open = siteNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.textContent = open ? "Close" : "Menu";
});

// Light mode is the default; the choice is remembered on this device.
const themeBtn = $("#themeToggle");
function updateThemeButton() {
    // The icons themselves are swapped in CSS; this keeps the label right.
    const label = document.documentElement.dataset.theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    themeBtn.setAttribute("aria-label", label);
    themeBtn.title = label;
}
themeBtn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
    updateThemeButton();
});
updateThemeButton();

$("#year").textContent = new Date().getFullYear();

loadProjects();
