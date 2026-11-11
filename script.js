// Projects page: filters, cards and the project popup.
import {
    CATEGORY_LABELS,
    CATEGORY_COLORS,
    DIFFICULTY_ORDER,
    PLACEHOLDER_IMG,
    escapeHTML,
    metaHTML,
    tagsHTML,
    fetchProjects,
    byStrongest,
    byFeatured
} from "./projects-data.js";

let allProjects = [];
let visibleProjects = [];

const state = {
    category: "all",
    difficulties: new Set(),
    query: "",
    sort: "featured"
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const grid = $("#projectGrid");
const loading = $("#loading");
const emptyState = $("#emptyState");
const resultCount = $("#resultCount");
const searchInput = $("#searchInput");
const levelDropdown = $("#levelDropdown");
const sortDropdown = $("#sortDropdown");
const levelBoxes = $$("input[type=checkbox]", levelDropdown);
const sortOptions = $$(".dd-option", sortDropdown);
const modal = $("#projectModal");
const toastEl = $("#toast");

const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let toastTimer;
function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2000);
}

/* ---------- Loading ---------- */

async function loadProjects() {
    loading.hidden = false;
    loading.textContent = "Loading projects…";
    try {
        allProjects = await fetchProjects();
    } catch (error) {
        console.error("Error loading projects:", error);
        loading.innerHTML = 'Couldn\'t load projects. <button class="link-btn" id="retryLoad">Try again</button>';
        $("#retryLoad").addEventListener("click", loadProjects);
        return;
    }

    loading.hidden = true;
    writeSummary();
    hideEmptyTabs();
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
    $("#summary").textContent = `${total} project${total === 1 ? "" : "s"}${parts.length ? ` · ${parts.join(", ")}` : ""}`;
}

// Categories with no projects yet would only lead to an empty page.
function hideEmptyTabs() {
    $$(".tab").forEach(tab => {
        const key = tab.dataset.filter;
        tab.hidden = key !== "all" && !allProjects.some(p => p.category === key);
    });
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
        "featured": byFeatured,
        "new-old": (a, b) => b.date - a.date,
        "old-new": (a, b) => a.date - b.date,
        "high-low": (a, b) => diff(b) - diff(a) || b.date - a.date,
        "low-high": (a, b) => diff(a) - diff(b) || b.date - a.date
    };
    return list.sort(sorters[state.sort] || byFeatured);
}

function cardHTML(p) {
    const id = escapeHTML(p.id);
    const notes = [
        p.previewVideo ? `<span class="video-note">video</span>` : "",
        p.githubLink ? `<span class="code-note">code</span>` : ""
    ].join("");

    return `
    <li>
        <article class="card" data-id="${id}" style="--cat:${CATEGORY_COLORS[p.category] || "#6a606c"}">
            <div class="card-media">
                <img src="${escapeHTML(p.thumb)}" alt="" loading="lazy">
                ${p.previewVideo ? `<video muted loop playsinline preload="none" data-src="${escapeHTML(p.previewVideo)}"></video>` : ""}
                ${notes ? `<div class="media-notes">${notes}</div>` : ""}
            </div>
            <div class="card-body">
                <h3 class="card-title"><a class="card-link" href="#project=${encodeURIComponent(p.id)}">${escapeHTML(p.title)}</a></h3>
                <p class="card-meta">${metaHTML(p)}</p>
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

    const total = allProjects.length;
    resultCount.textContent = visibleProjects.length === total
        ? `Showing all ${total} projects`
        : `Showing ${visibleProjects.length} of ${total} projects`;

    $$(".card", grid).forEach(setUpCard);
}

function markClippedText(desc) {
    const update = () => {
        const clipped = desc.scrollHeight > desc.clientHeight + 1;
        desc.classList.toggle("clipped", clipped);
        desc.classList.toggle("at-end", clipped && desc.scrollTop + desc.clientHeight >= desc.scrollHeight - 2);
    };
    update();
    desc.addEventListener("scroll", update, { passive: true });
}

function setUpCard(card) {
    const id = card.dataset.id;

    // The title is a real link (keyboard / middle-click); the whole card is clickable too.
    $(".card-link", card).addEventListener("click", e => {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        openModal(id, true);
    });
    card.addEventListener("click", e => {
        if (e.target.closest(".card-link")) return;
        if (getSelection().toString()) return; // don't open while selecting text
        openModal(id, true);
    });

    markClippedText($(".card-desc", card));

    // Play the project's video quietly while hovering, if it has one.
    const video = $("video", card);
    if (!video || !canHover || reduceMotion) return;
    card.addEventListener("mouseenter", () => {
        if (!video.src) video.src = video.dataset.src;
        video.play().then(() => card.classList.add("previewing")).catch(() => {});
    });
    card.addEventListener("mouseleave", () => {
        card.classList.remove("previewing");
        video.pause();
    });
}

window.addEventListener("resize", () => $$(".card-desc", grid).forEach(d => {
    d.classList.toggle("clipped", d.scrollHeight > d.clientHeight + 1);
}));

/* ---------- Controls ---------- */

$$(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        $$(".tab").forEach(t => t.setAttribute("aria-pressed", String(t === tab)));
        state.category = tab.dataset.filter;
        render();
    });
});

/* Dropdowns (Difficulty, Sort) */
const dropdowns = [levelDropdown, sortDropdown];

function closeDropdowns(except) {
    dropdowns.forEach(dd => {
        if (dd === except) return;
        dd.classList.remove("open");
        $(".dd-btn", dd).setAttribute("aria-expanded", "false");
    });
}

dropdowns.forEach(dd => {
    const btn = $(".dd-btn", dd);
    btn.addEventListener("click", () => {
        const open = !dd.classList.contains("open");
        closeDropdowns(dd);
        dd.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", String(open));
    });
    // Close when keyboard focus leaves the dropdown.
    dd.addEventListener("focusout", e => {
        if (e.relatedTarget && !dd.contains(e.relatedTarget)) closeDropdowns();
    });
    dd.addEventListener("keydown", e => {
        if (e.key === "Escape" && dd.classList.contains("open")) {
            e.stopPropagation();
            closeDropdowns();
            btn.focus();
        }
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
    sortOptions.forEach(o => o.setAttribute("aria-pressed", String(o.dataset.sort === value)));
    const chosen = sortOptions.find(o => o.dataset.sort === value);
    $("#sortLabel").textContent = chosen ? chosen.textContent : "";
    render();
}

sortOptions.forEach(option => {
    option.addEventListener("click", () => {
        setSort(option.dataset.sort);
        closeDropdowns();
        $(".dd-btn", sortDropdown).focus();
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
let pushedHistory = false;

const swiperEl = $("#modalSwiper");
// Everything behind the popup; made inert while it's open so Tab stays inside.
const background = () => Array.from(document.body.children)
    .filter(el => el !== modal && el !== toastEl && el.tagName !== "SCRIPT");

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
        speed: reduceMotion ? 0 : 300,
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
    $("#modalMeta").innerHTML = metaHTML(p, true);
    $("#modalTech").innerHTML = tagsHTML(p);
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

    // If focus was on a button that just got hidden (e.g. Next on the last project), move it somewhere sensible.
    const active = document.activeElement;
    if (!modal.contains(active) || active.hidden) $(".modal-close", modal).focus({ preventScroll: true });
}

function setNavButton(btn, project) {
    btn.hidden = !project;
    btn.dataset.target = project ? project.id : "";
    $("span", btn).textContent = project ? project.title : "";
}

function openModal(id, fromClick = false) {
    const project = allProjects.find(p => p.id === id);
    if (!project) return;

    const hash = `#project=${encodeURIComponent(id)}`;
    if (!modal.classList.contains("open")) {
        lastFocused = document.activeElement;
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
        background().forEach(el => (el.inert = true));
        $(".modal-close", modal).focus({ preventScroll: true });
        // A history entry lets the phone's Back button close the popup.
        if (fromClick) {
            history.pushState({ project: id }, "", hash);
            pushedHistory = true;
        } else {
            history.replaceState(null, "", hash);
        }
    } else {
        history.replaceState(history.state, "", hash);
    }
    if (modalSwiper && modalSwiper.keyboard) modalSwiper.keyboard.enable();

    fillModal(project);
}

function hideModal() {
    if (!modal.classList.contains("open")) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    background().forEach(el => (el.inert = false));
    swiperEl.querySelectorAll("video").forEach(v => v.pause());
    if (modalSwiper && modalSwiper.keyboard) modalSwiper.keyboard.disable();
    currentId = null;
    if (lastFocused && document.body.contains(lastFocused)) lastFocused.focus({ preventScroll: true });
}

function closeModal() {
    if (!modal.classList.contains("open")) return;
    if (pushedHistory) {
        pushedHistory = false;
        history.back(); // popstate below hides the popup
    } else {
        history.replaceState(null, "", location.pathname + location.search);
        hideModal();
    }
}

window.addEventListener("popstate", () => {
    const match = location.hash.match(/^#project=(.+)$/);
    if (match) {
        openModal(decodeURIComponent(match[1]));
    } else {
        pushedHistory = false;
        hideModal();
    }
});

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

loadProjects();
