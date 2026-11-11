import { escapeHTML, techLabel, techColor, fetchProjects, byStrongest, TECH } from "./projects-data.js";
import { DIFFICULTY_WEIGHT, SKILL_ORDER, levelFromProjects, levelWord, AREAS, DEVICON_BASE } from "./skills-data.js";
import { start as startContent, toolbeltItem, cachedContent, mergeContent } from "./site-content.js";

let S = null;

const $ = id => document.getElementById(id);
const projectUrl = p => `project.html#project=${encodeURIComponent(p.id)}`;
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const plural = (n, word) => `${WORDS[n] || n} ${word}${n === 1 ? "" : "s"}`;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const orderIndex = label => {
    const i = SKILL_ORDER.indexOf(label);
    return i < 0 ? SKILL_ORDER.length : i;
};

function buildSkills(projects) {
    const skills = new Map();
    const add = (key, name) => {
        const label = TECH[key] || !name ? techLabel(key) : name;
        if (!skills.has(label)) skills.set(label, { key, label, projects: [], score: 0, fixedLevel: 0 });
        return skills.get(label);
    };

    [...projects].sort(byStrongest).forEach(p => p.techs.forEach(key => {
        const s = add(key);
        if (!s.projects.includes(p)) {
            s.projects.push(p);
            s.score += DIFFICULTY_WEIGHT[p.difficulty] || 1;
        }
    }));
    S.extraSkills.forEach(extra => { add(extra.key, extra.name).fixedLevel = extra.level; });

    return [...skills.values()]
        .map(s => ({
            ...s,
            level: Math.max(0, Math.min(100,
                (s.projects.length ? levelFromProjects(s.score) : Number(s.fixedLevel) || 0)
                + (Number(S.adjust[s.label]) || 0)))
        }))
        .sort((a, b) => b.level - a.level || orderIndex(a.label) - orderIndex(b.label) || a.label.localeCompare(b.label));
}

function evidence(skill) {
    const n = skill.projects.length;
    if (!n) return "Not in a project here yet";
    if (n <= 2) return "Used in " + skill.projects
        .map(p => `<a href="${projectUrl(p)}">${escapeHTML(p.title)}</a>`).join(" and ");
    return `Used in ${plural(n, "project")}`;
}

function renderBars(projects) {
    const list = $("barList");
    list.innerHTML = buildSkills(projects).map((skill, i) => {
        const word = levelWord(skill.level);
        const nameId = `skill-${i}`;
        return `
        <li class="bar" style="--tag:${techColor(skill.key)}; --level:${skill.level}%; --i:${i}">
            <span class="bar-name" id="${nameId}">${escapeHTML(skill.label)}</span>
            <span class="bar-track" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${skill.level}"
                  aria-valuetext="${escapeHTML(word)}" aria-labelledby="${nameId}"><span class="bar-fill"></span></span>
            <span class="bar-word" aria-hidden="true">${escapeHTML(word)}</span>
            <span class="bar-used">${evidence(skill)}</span>
        </li>`;
    }).join("");

    requestAnimationFrame(() => requestAnimationFrame(() => list.classList.add("ready")));
}

const C = { x: 280, y: 200 };
const R_IN = 96, R_OUT = 144;

function point(r, angle) {
    return [C.x + r * Math.sin(angle), C.y - r * Math.cos(angle)];
}
const fmt = n => n.toFixed(2);

function bandPath(a0, a1) {
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const [x0, y0] = point(R_OUT, a0), [x1, y1] = point(R_OUT, a1);
    const [x2, y2] = point(R_IN, a1), [x3, y3] = point(R_IN, a0);
    return `M${fmt(x0)} ${fmt(y0)} A${R_OUT} ${R_OUT} 0 ${large} 1 ${fmt(x1)} ${fmt(y1)} ` +
           `L${fmt(x2)} ${fmt(y2)} A${R_IN} ${R_IN} 0 ${large} 0 ${fmt(x3)} ${fmt(y3)} Z`;
}

function groupByArea(projects) {
    const groups = AREAS.map(a => ({ ...a, text: S.areaTexts[a.key] || a.text, projects: [] }));
    projects.forEach(p => {
        const g = groups.find(a => a.test(p));
        if (g) g.projects.push(p);
    });
    return groups
        .filter(g => g.projects.length)
        .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

let groups = [];
let selected = null;

function renderDonut(projects) {
    groups = groupByArea([...projects].sort(byStrongest));
    const weight = g => g.projects.reduce((n, p) => n + (DIFFICULTY_WEIGHT[p.difficulty] || 1), 0);
    const total = groups.reduce((n, g) => n + weight(g), 0);
    const svg = $("donut");
    if (!total) { svg.closest(".panel-col").hidden = true; return; }

    const gap = groups.length > 1 ? 0.035 : 0;
    let angle = 0;
    let segments = "", labels = "";

    groups.forEach((g, i) => {
        const sweep = (weight(g) / total) * Math.PI * 2;
        const a0 = angle + gap / 2, a1 = angle + sweep - gap / 2;
        const mid = angle + sweep / 2;
        angle += sweep;

        const d = groups.length === 1
            ? `M${C.x} ${C.y - R_OUT} a${R_OUT} ${R_OUT} 0 1 1 0 ${R_OUT * 2} a${R_OUT} ${R_OUT} 0 1 1 0 ${-R_OUT * 2} Z ` +
              `M${C.x} ${C.y - R_IN} a${R_IN} ${R_IN} 0 1 0 0 ${R_IN * 2} a${R_IN} ${R_IN} 0 1 0 0 ${-R_IN * 2} Z`
            : bandPath(a0, a1);
        const [dx, dy] = point((R_IN + R_OUT) / 2, mid);

        const name = `${g.label}: ${plural(g.projects.length, "project")}`;
        segments += `
        <g class="donut-seg" data-key="${g.key}" style="--seg:${g.color}; --i:${i}" tabindex="0" role="button" aria-pressed="false" aria-controls="areaDetail" aria-label="${escapeHTML(name)}">
            <path d="${d}" fill-rule="evenodd"></path>
            <circle class="seg-dot" cx="${fmt(dx)}" cy="${fmt(dy)}" r="5"></circle>
        </g>`;

        const right = Math.sin(mid) >= 0;
        const [lx1, ly1] = point(R_OUT + 8, mid);
        const [lx2, ly2] = point(R_OUT + 30, mid);
        const lx3 = lx2 + (right ? 26 : -26);
        const tx = lx3 + (right ? 8 : -8);
        labels += `
        <g class="donut-label" data-key="${g.key}" style="--seg:${g.color}" aria-hidden="true">
            <polyline points="${fmt(lx1)},${fmt(ly1)} ${fmt(lx2)},${fmt(ly2)} ${fmt(lx3)},${fmt(ly2)}"></polyline>
            <text x="${fmt(tx)}" y="${fmt(ly2 - 3)}" text-anchor="${right ? "start" : "end"}">${escapeHTML(g.label)}</text>
            <text class="donut-label-count" x="${fmt(tx)}" y="${fmt(ly2 + 15)}" text-anchor="${right ? "start" : "end"}">${cap(plural(g.projects.length, "project"))}</text>
        </g>`;
    });

    svg.innerHTML = `
        ${segments}
        ${labels}
        <g class="donut-center" aria-hidden="true">
            <text class="donut-title" id="donutTitle" x="${C.x}" y="${C.y - 2}" text-anchor="middle"></text>
            <text class="donut-sub" id="donutSub" x="${C.x}" y="${C.y + 24}" text-anchor="middle"></text>
        </g>`;

    svg.querySelectorAll(".donut-seg").forEach(seg => {
        seg.addEventListener("mouseenter", () => highlight(seg.dataset.key));
        seg.addEventListener("focus", () => highlight(seg.dataset.key));
        seg.addEventListener("blur", () => highlight(selected));
        seg.addEventListener("click", () => select(seg.dataset.key, true));
        seg.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(seg.dataset.key, true); }
        });
    });
    svg.addEventListener("mouseleave", () => highlight(selected));

    const phone = window.matchMedia("(max-width: 560px)");
    const fitView = () => {
        svg.setAttribute("viewBox", phone.matches ? "124 44 312 312" : "0 0 560 400");
        $("focusHint").textContent = phone.matches
            ? "Tap a slice to see its area and projects."
            : "Select an area to see its projects.";
    };
    fitView();
    phone.addEventListener("change", fitView);

    const start = groups.find(g => g.key === S.defaultArea) || groups.find(g => g.key === "gameplay")
        || [...groups].sort((a, b) => b.projects.length - a.projects.length)[0];
    select(start.key, false);
    if (!reduceMotion) svg.classList.add("animate");
}

function highlight(key) {
    const g = groups.find(x => x.key === key);
    if (!g) return;
    $("donut").querySelectorAll("[data-key]").forEach(el => el.classList.toggle("is-active", el.dataset.key === key));
    $("donut").classList.add("has-selection");
    $("donutTitle").textContent = g.label;
    $("donutSub").textContent = cap(plural(g.projects.length, "project"));
}

function select(key, byUser) {
    const g = groups.find(x => x.key === key);
    if (!g) return;
    selected = key;
    highlight(key);

    $("donut").querySelectorAll(".donut-seg").forEach(seg => {
        seg.setAttribute("aria-pressed", String(seg.dataset.key === key));
    });

    const detail = $("areaDetail");
    if (byUser) detail.setAttribute("aria-live", "polite");
    detail.style.setProperty("--seg", g.color);
    detail.innerHTML = `
        <h3>${escapeHTML(g.label)}</h3>
        <p>${escapeHTML(g.text)}</p>
        <ul class="area-projects">
            ${g.projects.map(p => `<li><a href="${projectUrl(p)}">${escapeHTML(p.title)}</a></li>`).join("")}
        </ul>`;
}

const BELT_SPEED = 22;
const BELT_HOVER_RATE = 0.3;

function beltItem(t, isRepeat) {
    const cls = [t.mono && "mono", t.square && "square"].filter(Boolean).join(" ");
    const mark = t.icon
        ? `<img src="${DEVICON_BASE}${t.icon}.svg" alt="" width="44" height="44" decoding="async"${cls ? ` class="${cls}"` : ""}>`
        : `<span class="belt-badge" style="--c:${t.color || "#6f6873"}">${escapeHTML(t.badge || t.name)}</span>`;
    return `<span class="belt-item"${isRepeat ? " data-dup" : ""}>${mark}<span class="belt-name">${escapeHTML(t.name)}</span></span>`;
}

function renderBelt() {
    const belt = $("toolbelt");
    const TOOLBELT = S.toolbelt.map(toolbeltItem).filter(t => t.name);
    $("toolbeltList").innerHTML = TOOLBELT.map(t => `<li>${escapeHTML(t.name)}</li>`).join("");

    [[1, "beltLanguages"], [2, "beltTools"]].forEach(([row, id]) => {
        const items = TOOLBELT.filter(t => t.row === row);
        const track = $(id);
        if (!items.length) { track.closest(".belt-row").hidden = true; return; }

        const set = [];
        while (set.length < Math.max(14, items.length)) set.push(...items);
        const html = set.map((t, i) => beltItem(t, i >= items.length)).join("");
        track.innerHTML = `<div class="belt-set">${html}</div><div class="belt-set belt-set--copy">${html}</div>`;
    });

    const start = () => { setBeltSpeed(); belt.classList.add("is-ready"); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
    if ("ResizeObserver" in window) {
        const ro = new ResizeObserver(setBeltSpeed);
        belt.querySelectorAll(".belt-set:not(.belt-set--copy)").forEach(s => ro.observe(s));
    }

    if (window.matchMedia("(hover: hover)").matches) {
        belt.addEventListener("mouseenter", () => easeBeltSpeed(BELT_HOVER_RATE));
        belt.addEventListener("mouseleave", () => easeBeltSpeed(1));
    }

    if ("IntersectionObserver" in window) {
        new IntersectionObserver(([entry]) => belt.classList.toggle("is-offscreen", !entry.isIntersecting))
            .observe(belt);
    }
}

let beltRate = 1, beltEase = 0;
function easeBeltSpeed(target) {
    cancelAnimationFrame(beltEase);
    const from = beltRate, startTime = performance.now(), duration = 500;
    const step = now => {
        const t = Math.min(1, (now - startTime) / duration);
        beltRate = from + (target - from) * (1 - Math.pow(1 - t, 3));
        document.querySelectorAll(".belt-track").forEach(track =>
            track.getAnimations().forEach(a => { a.playbackRate = beltRate; }));
        if (t < 1) beltEase = requestAnimationFrame(step);
    };
    beltEase = requestAnimationFrame(step);
}

function setBeltSpeed() {
    document.querySelectorAll(".belt-track").forEach(track => {
        const set = track.querySelector(".belt-set");
        if (set && set.offsetWidth) track.style.animationDuration = `${Math.round(set.offsetWidth / BELT_SPEED)}s`;
    });
}

S = (cachedContent() || mergeContent({})).skills;
renderBelt();
const contentReady = startContent().then(content => {
    const beltChanged = JSON.stringify(content.skills.toolbelt) !== JSON.stringify(S.toolbelt);
    S = content.skills;
    if (beltChanged) renderBelt();
    return content;
});

Promise.all([fetchProjects(), contentReady])
    .then(([projects]) => {
        $("loading").hidden = true;
        renderBars(projects);
        renderDonut(projects);
    })
    .catch(error => {
        console.error("Error loading projects:", error);
        $("loading").textContent = "Couldn't load skills. Please refresh the page.";
        $("donut").closest(".panel-col").hidden = true;
    });
