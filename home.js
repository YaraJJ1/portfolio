import {
    CATEGORY_COLORS,
    escapeHTML,
    metaHTML,
    tagsHTML,
    techLabel,
    formatDate,
    fetchProjects,
    byFeatured
} from "./projects-data.js";
import { start as startContent, cachedContent, mergeContent } from "./site-content.js";

const $ = id => document.getElementById(id);
const projectUrl = p => `project.html#project=${encodeURIComponent(p.id)}`;

const canPreview = window.matchMedia("(hover: hover) and (pointer: fine)").matches
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const HERO_KEY = "heroImage";
try {
    const last = localStorage.getItem(HERO_KEY);
    if (last) {
        const img = $("heroShotImg");
        img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
        img.src = last;
    }
} catch (e) {}

const HERO_DELAY = 9000;

function setCredit(p) {
    const link = $("heroShotLink");
    link.href = projectUrl(p);
    link.title = [formatDate(p.date), p.techs.map(techLabel).join(", ")].filter(Boolean).join(" · ");
    $("heroShotTitle").textContent = p.title;
    link.hidden = false;
}

function showHero(list) {
    const first = list[0];
    try { localStorage.setItem(HERO_KEY, first.thumb); } catch (e) {}
    const base = $("heroShotImg");
    if (base.getAttribute("src") !== first.thumb) {
        base.classList.remove("loaded");
        base.addEventListener("load", () => base.classList.add("loaded"), { once: true });
        base.src = first.thumb;
    }
    setCredit(first);
    if (list.length < 2) return;

    const banner = $("heroBanner");
    const credit = $("heroShotLink");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const track = document.createElement("div");
    track.className = "hero-slides";
    base.before(track);
    const slides = list.map((p, i) => {
        const slide = document.createElement("div");
        slide.className = "hero-slide";
        let img = base;
        if (i > 0) {
            img = document.createElement("img");
            img.className = "hero-bg";
            img.alt = "";
            img.decoding = "async";
        }
        slide.appendChild(img);
        slide.style.transform = i === 0 ? "translateX(0)" : "translateX(100%)";
        track.appendChild(slide);
        return slide;
    });
    banner.classList.add("has-slides");

    const load = i => {
        const img = slides[i].querySelector("img");
        if (img.getAttribute("src")) return;
        img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
        img.src = list[i].thumb;
    };

    const controls = $("heroControls");
    controls.innerHTML = `<span class="hero-dots">${list.map((p, i) => `<button type="button" class="hero-dot" data-i="${i}" aria-label="Show ${escapeHTML(p.title)}"></button>`).join("")}</span>`;
    controls.hidden = false;
    banner.insertAdjacentHTML("beforeend", `
        <button type="button" class="hero-edge hero-edge-prev" data-dir="-1" aria-label="Previous picture"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg></button>
        <button type="button" class="hero-edge hero-edge-next" data-dir="1" aria-label="Next picture"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></button>`);
    banner.querySelectorAll(".hero-edge").forEach(btn => btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.dir);
        stopped = true;
        go(index + dir, dir);
    }));
    const dots = [...controls.querySelectorAll(".hero-dot")];

    let index = 0;
    let timer = null;
    let paused = false;
    let creditTimer = null;
    let stopped = false;
    let lock = 0;

    const mark = () => dots.forEach((d, i) => d.setAttribute("aria-current", i === index ? "true" : "false"));
    const finishCredit = () => { clearTimeout(creditTimer); setCredit(list[index]); credit.classList.remove("is-changing"); };
    const schedule = () => {
        clearTimeout(timer);
        if (stopped) return;
        if (!reduced && !paused && !document.hidden) timer = setTimeout(() => go(index + 1, 1), HERO_DELAY);
    };

    function go(to, dir) {
        to = (to + list.length) % list.length;
        if (to === index) return;
        load(to);
        load((to + dir + list.length) % list.length);
        const incoming = slides[to];
        const outgoing = slides[index];
        slides.forEach((s, i) => { if (i !== to && i !== index) { s.classList.add("no-anim"); s.style.transform = "translateX(100%)"; } });
        incoming.classList.add("no-anim");
        incoming.style.transform = `translateX(${dir * 100}%)`;
        void incoming.offsetWidth;
        incoming.classList.remove("no-anim");
        incoming.style.transform = "translateX(0)";
        outgoing.classList.remove("no-anim");
        outgoing.style.transform = `translateX(${-dir * 100}%)`;
        index = to;
        mark();
        credit.classList.add("is-changing");
        clearTimeout(creditTimer);
        creditTimer = setTimeout(finishCredit, 350);
        lock = performance.now() + 600;
        schedule();
    }

    controls.addEventListener("click", e => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const i = Number(btn.dataset.i);
        stopped = true;
        go(i, i > index ? 1 : -1);
    });

    const n = list.length;
    const place = (s, x) => { s.classList.add("no-anim"); s.style.transform = x; };
    let drag = null;
    let justDragged = false;
    banner.addEventListener("pointerdown", e => {
        if (e.button !== 0 || e.target.closest("a, button") || performance.now() < lock) return;
        drag = { x: e.clientX, y: e.clientY, dx: 0, id: e.pointerId, active: false, nb: -1, t: performance.now() };
    });
    banner.addEventListener("pointermove", e => {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.active) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            if (Math.abs(dy) >= Math.abs(dx)) { drag = null; return; }
            drag.active = true;
            try { banner.setPointerCapture(e.pointerId); } catch (err) {}
            banner.classList.add("is-dragging");
            clearTimeout(timer);
            const sel = window.getSelection && window.getSelection();
            if (sel) sel.removeAllRanges();
        }
        e.preventDefault();
        drag.dx = dx;
        const dir = dx < 0 ? 1 : -1;
        const nb = (index + dir + n) % n;
        if (drag.nb !== -1 && drag.nb !== nb && drag.nb !== index) place(slides[drag.nb], "translateX(100%)");
        drag.nb = nb;
        drag.dir = dir;
        load(nb);
        place(slides[index], `translateX(${dx}px)`);
        if (nb !== index) place(slides[nb], `translateX(calc(${dir * 100}% + ${dx}px))`);
    });
    const endDrag = e => {
        if (!drag || (e && e.pointerId !== drag.id)) return;
        const d = drag;
        drag = null;
        if (!d.active) return;
        banner.classList.remove("is-dragging");
        justDragged = true;
        setTimeout(() => { justDragged = false; }, 0);
        const width = banner.clientWidth || 1;
        const speed = Math.abs(d.dx) / Math.max(1, performance.now() - d.t);
        const cur = slides[index];
        const nb = slides[d.nb];
        void cur.offsetWidth;
        cur.classList.remove("no-anim");
        nb.classList.remove("no-anim");
        if (d.nb !== index && (Math.abs(d.dx) > width * 0.18 || (speed > 0.5 && Math.abs(d.dx) > 30))) {
            nb.style.transform = "translateX(0)";
            cur.style.transform = `translateX(${-d.dir * 100}%)`;
            index = d.nb;
            stopped = true;
            lock = performance.now() + 600;
            mark();
            credit.classList.add("is-changing");
            clearTimeout(creditTimer);
            creditTimer = setTimeout(finishCredit, 350);
        } else {
            cur.style.transform = "translateX(0)";
            if (d.nb !== index) nb.style.transform = `translateX(${d.dir * 100}%)`;
        }
        schedule();
    };
    banner.addEventListener("pointerup", endDrag);
    banner.addEventListener("pointercancel", endDrag);
    banner.addEventListener("click", e => { if (justDragged) { e.preventDefault(); e.stopPropagation(); } }, true);
    banner.addEventListener("dragstart", e => e.preventDefault());

    const pause = () => { paused = true; clearTimeout(timer); };
    const resume = () => { paused = false; schedule(); };
    banner.addEventListener("focusin", e => { if (e.target.matches(":focus-visible")) pause(); });
    banner.addEventListener("focusout", resume);
    banner.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") pause(); });
    banner.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") resume(); });
    document.addEventListener("visibilitychange", schedule);

    mark();
    load(1);
    load(list.length - 1);
    schedule();
}

function showFacts(projects) {
    const counts = {};
    projects.forEach(p => p.techs.forEach(t => {
        const label = techLabel(t);
        counts[label] = (counts[label] || 0) + 1;
    }));
    const topTech = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 2);
    const latest = [...projects].sort((a, b) => b.date - a.date)[0];

    $("factCount").textContent = projects.length;
    $("factTech").textContent = topTech.join(", ");
    $("factLatest").innerHTML = latest
        ? `<a href="${projectUrl(latest)}">${escapeHTML(latest.title)}</a>`
        : "";
    $("heroFacts").hidden = false;
}

function workItem(p) {
    const video = p.previewVideo && canPreview
        ? `<video muted loop playsinline preload="none" data-src="${escapeHTML(p.previewVideo)}"></video>`
        : "";
    return `
    <li class="work" style="--cat:${CATEGORY_COLORS[p.category] || "#6a606c"}">
        <a class="work-media" href="${projectUrl(p)}" tabindex="-1" aria-hidden="true">
            <img src="${escapeHTML(p.thumb)}" alt="" loading="lazy">
            ${video}
        </a>
        <div class="work-body">
            <p class="card-meta">${metaHTML(p)}</p>
            <h3 class="work-title"><a href="${projectUrl(p)}">${escapeHTML(p.title)}</a></h3>
            <p class="work-desc">${escapeHTML(p.summary)}</p>
            <div class="tags">${tagsHTML(p)}</div>
            <a class="work-more" href="${projectUrl(p)}" aria-hidden="true" tabindex="-1">Read more &rarr;</a>
        </div>
    </li>`;
}

function setUpPreviews(list) {
    list.querySelectorAll(".work-media").forEach(media => {
        const video = media.querySelector("video");
        if (!video) return;
        media.addEventListener("mouseenter", () => {
            if (!video.src) video.src = video.dataset.src;
            video.play().then(() => media.classList.add("previewing")).catch(() => {});
        });
        media.addEventListener("mouseleave", () => {
            media.classList.remove("previewing");
            video.pause();
        });
    });
}

const AREAS = {
    gameplay: p => /grappl|ship|buoy|bouy|controller|movement/i.test(p.title),
    graphics: p => p.techs.includes("hlsl") || /shader|render/i.test(p.title),
    animation: p => /animation/i.test(p.title) || p.category === "web" || p.category === "others"
};

function showAreaLinks(projects) {
    document.querySelectorAll(".area").forEach(area => {
        const match = AREAS[area.dataset.area];
        const found = match ? projects.filter(match) : [];
        const holder = area.querySelector(".area-links");
        if (!found.length) { holder.remove(); return; }
        holder.innerHTML = `<span class="area-links-label">Seen in</span> ` +
            found.map(p => `<a href="${projectUrl(p)}">${escapeHTML(p.title)}</a>`).join(", ");
    });
}

let email = "janahi.yara@gmail.com";
function applyHomeText(content) {
    email = content.contact.email;
    document.querySelectorAll(".area").forEach((area, i) => {
        const item = content.home.areas[i];
        if (!item) return;
        area.querySelector("h3").textContent = item.title;
        area.querySelector("p:not(.area-links)").textContent = item.text;
    });
}
applyHomeText(cachedContent() || mergeContent({}));
const contentReady = startContent().then(content => { applyHomeText(content); return content; });

Promise.all([fetchProjects(), contentReady])
    .then(([projects, content]) => {
        $("loading").hidden = true;
        const sorted = [...projects].sort(byFeatured);
        if (!sorted.length) return;

        const heroIds = (content.home.heroProjects && content.home.heroProjects.length) ? content.home.heroProjects : [content.home.heroProject];
        const heroes = heroIds.map(id => sorted.find(p => p.id === id)).filter((p, i, arr) => p && p.thumb && arr.indexOf(p) === i);
        if (!heroes.length) heroes.push(sorted[0]);
        const hero = heroes[0];
        showHero(heroes);
        showFacts(projects);
        showAreaLinks(sorted);

        const list = $("workList");
        const picks = (content.home.selectedWork || [])
            .map(id => sorted.find(p => p.id === id))
            .filter((p, i, arr) => p && p !== hero && arr.indexOf(p) === i);
        const rest = sorted.filter(p => p !== hero && !picks.includes(p));
        const shown = [];
        for (let i = 0; i < 3; i++) {
            const wanted = (content.home.selectedWork || [])[i];
            const pick = wanted && picks.find(p => p.id === wanted);
            if (pick && !shown.includes(pick)) shown.push(pick);
            else if (rest.length) shown.push(rest.shift());
        }
        list.innerHTML = shown.map(workItem).join("");
        setUpPreviews(list);
        $("allProjectsLink").innerHTML = `All ${projects.length} projects &rarr;`;
    })
    .catch(error => {
        console.error("Error loading projects:", error);
        $("loading").innerHTML = 'Couldn\'t load projects right now. <a href="project.html">Try the projects page</a>.';
    });

const toast = $("toast");
let toastTimer;
$("copyEmail").addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(email);
        toast.textContent = "Email address copied";
    } catch (e) {
        toast.textContent = "Couldn't copy. The address is " + email;
    }
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
});
