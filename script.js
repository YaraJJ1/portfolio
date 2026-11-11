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

const TECH_LABELS = {
    html: "HTML",
    css: "CSS",
    js: "JavaScript",
    javascript: "JavaScript",
    ts: "TypeScript",
    typescript: "TypeScript",
    java: "Java",
    "c++": "C++",
    "c#": "C#",
    python: "Python",
    unity: "Unity",
    php: "PHP",
    sql: "SQL",
    hlsl: "HLSL"
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
const sortSelect = $("#sortSelect");
const levelBoxes = $$(".levels input");
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

const techLabel = key => TECH_LABELS[key] || key.toUpperCase();
const capitalize = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

function metaLine(p, longDate) {
    return [formatDate(p.date, longDate), CATEGORY_LABELS[p.category] || capitalize(p.category), capitalize(p.difficulty)]
        .filter(Boolean)
        .join(" · ");
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
                <h3 class="card-title">${escapeHTML(p.title)}</h3>
                <p class="card-meta">${escapeHTML(metaLine(p))}</p>
                <p class="card-desc">${escapeHTML(p.summary)}</p>
                <p class="card-tech">${escapeHTML(p.techs.map(techLabel).join(", "))}</p>
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

levelBoxes.forEach(box => {
    box.addEventListener("change", () => {
        box.checked ? state.difficulties.add(box.value) : state.difficulties.delete(box.value);
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
    levelBoxes.forEach(b => (b.checked = false));
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
    $("#modalMeta").textContent = metaLine(p, true);
    $("#modalTech").textContent = p.techs.map(techLabel).join(", ");
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
    if (e.key === "Escape") closeModal();
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

$("#year").textContent = new Date().getFullYear();

loadProjects();
