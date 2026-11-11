// Skills page: skill bars on the left, a "focus" donut chart on the right.
// Bar levels and chart areas are set in skills-data.js.
import { escapeHTML, techLabel, techColor, fetchProjects, byStrongest } from "./projects-data.js";
import { EXTRA_SKILLS, DIFFICULTY_WEIGHT, levelFromProjects, AREAS, levelWord } from "./skills-data.js";

const $ = id => document.getElementById(id);
const projectUrl = p => `project.html#project=${encodeURIComponent(p.id)}`;
// Counts as words: this font's "1" looks like an "I".
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const plural = (n, word) => `${WORDS[n] || n} ${word}${n === 1 ? "" : "s"}`;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Skill bars ----------
function buildSkills(projects) {
    const skills = new Map();
    const add = (key, fixedLevel) => {
        const label = techLabel(key);
        if (!skills.has(label)) skills.set(label, { key, label, fixedLevel, used: 0, score: 0 });
        return skills.get(label);
    };

    // Every technology used in a project gets a bar automatically...
    projects.forEach(p => p.techs.forEach(key => {
        const s = add(key);
        s.used += 1;
        s.score += DIFFICULTY_WEIGHT[p.difficulty] || 1;
    }));
    // ...plus the extra skills listed in skills-data.js.
    EXTRA_SKILLS.forEach(s => {
        const entry = add(s.key, s.level);
        if (entry.used === 0) entry.fixedLevel = s.level;
    });

    return [...skills.values()]
        .map(s => ({ ...s, level: s.used ? levelFromProjects(s.score) : Math.max(0, Math.min(100, s.fixedLevel || 0)) }))
        .sort((a, b) => b.level - a.level || b.used - a.used || a.label.localeCompare(b.label));
}

// 10 dots: one full dot per 10 points, a faded dot for 5+ left over.
function dotsHTML(level) {
    const full = Math.floor(level / 10);
    const half = level % 10 >= 5 ? 1 : 0;
    return Array.from({ length: 10 }, (_, d) =>
        `<i class="dot${d < full ? " on" : d < full + half ? " half" : ""}" style="--d:${d}"></i>`).join("");
}

function renderBars(projects) {
    const list = $("barList");
    list.innerHTML = buildSkills(projects).map((skill, i) => {
        const word = levelWord(skill.level);
        const source = skill.used
            ? `used in ${plural(skill.used, "project")}`
            : "outside these projects";
        return `
        <li class="bar" style="--tag:${techColor(skill.key)}; --i:${i}">
            <span class="bar-name">${escapeHTML(skill.label)}</span>
            <span class="dots" role="meter" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${Math.round(skill.level / 10)}"
                  aria-valuetext="${escapeHTML(word)}, ${Math.round(skill.level / 10)} out of 10" aria-label="${escapeHTML(skill.label)}">${dotsHTML(skill.level)}</span>
            <span class="bar-used"><span class="bar-word">${escapeHTML(word)}</span> · ${source}</span>
        </li>`;
    }).join("");

    // Light the dots up once they're on the page.
    requestAnimationFrame(() => requestAnimationFrame(() => list.classList.add("ready")));
}

// ---------- Focus donut ----------
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
    const groups = AREAS.map(a => ({ ...a, projects: [] }));
    projects.forEach(p => {
        const g = groups.find(a => a.test(p));
        if (g) g.projects.push(p);
    });
    return groups.filter(g => g.projects.length);
}

let groups = [];
let selected = null;

function renderDonut(projects) {
    groups = groupByArea([...projects].sort(byStrongest));
    const total = groups.reduce((n, g) => n + g.projects.length, 0);
    const svg = $("donut");
    if (!total) { svg.closest(".panel-col").hidden = true; return; }

    const gap = groups.length > 1 ? 0.035 : 0;
    let angle = 0;
    let segments = "", labels = "";

    groups.forEach((g, i) => {
        const sweep = (g.projects.length / total) * Math.PI * 2;
        const a0 = angle + gap / 2, a1 = angle + sweep - gap / 2;
        const mid = angle + sweep / 2;
        angle += sweep;

        // A single area is a full ring.
        const d = groups.length === 1
            ? `M${C.x} ${C.y - R_OUT} a${R_OUT} ${R_OUT} 0 1 1 0 ${R_OUT * 2} a${R_OUT} ${R_OUT} 0 1 1 0 ${-R_OUT * 2} Z ` +
              `M${C.x} ${C.y - R_IN} a${R_IN} ${R_IN} 0 1 0 0 ${R_IN * 2} a${R_IN} ${R_IN} 0 1 0 0 ${-R_IN * 2} Z`
            : bandPath(a0, a1);
        const [dx, dy] = point((R_IN + R_OUT) / 2, mid);
        const name = `${g.label}: ${plural(g.projects.length, "project")}`;

        segments += `
        <g class="donut-seg" data-key="${g.key}" style="--seg:${g.color}; --i:${i}" tabindex="0" role="button" aria-label="${escapeHTML(name)}">
            <title>${escapeHTML(name)}</title>
            <path d="${d}" fill-rule="evenodd"></path>
            <circle class="seg-dot" cx="${fmt(dx)}" cy="${fmt(dy)}" r="5"></circle>
        </g>`;

        // Callout: a short line out from the ring, then sideways to the label.
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

    $("areaLegend").innerHTML = groups.map(g => `
        <button type="button" class="legend-item" data-key="${g.key}" style="--seg:${g.color}" aria-pressed="false">
            <span class="legend-dot" aria-hidden="true"></span>${escapeHTML(g.label)}
        </button>`).join("");

    // Hover, focus or click an area to select it.
    svg.querySelectorAll(".donut-seg").forEach(seg => {
        const pick = () => select(seg.dataset.key);
        seg.addEventListener("mouseenter", pick);
        seg.addEventListener("focus", pick);
        seg.addEventListener("click", pick);
        seg.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
        });
    });
    $("areaLegend").addEventListener("click", e => {
        const btn = e.target.closest(".legend-item");
        if (btn) select(btn.dataset.key);
    });

    // On phones the callout labels are hidden, so zoom in on the ring itself.
    const phone = window.matchMedia("(max-width: 560px)");
    const fitView = () => svg.setAttribute("viewBox", phone.matches ? "124 44 312 312" : "0 0 560 400");
    fitView();
    phone.addEventListener("change", fitView);

    // Start on the biggest area.
    const biggest = [...groups].sort((a, b) => b.projects.length - a.projects.length)[0];
    select(biggest.key);
    if (!reduceMotion) svg.classList.add("animate");
}

function select(key) {
    if (key === selected) return;
    selected = key;
    const g = groups.find(x => x.key === key);
    if (!g) return;

    document.querySelectorAll("[data-key]").forEach(el => {
        el.classList.toggle("is-active", el.dataset.key === key);
        if (el.classList.contains("legend-item")) el.setAttribute("aria-pressed", String(el.dataset.key === key));
    });
    $("donut").classList.add("has-selection");

    $("donutTitle").textContent = g.label;
    $("donutSub").textContent = cap(plural(g.projects.length, "project"));

    $("areaDetail").style.setProperty("--seg", g.color);
    $("areaDetail").innerHTML = `
        <h3>${escapeHTML(g.label)}</h3>
        <p>${escapeHTML(g.text)}</p>
        <ul class="area-projects">
            ${g.projects.map(p => `<li><a href="${projectUrl(p)}">${escapeHTML(p.title)}</a></li>`).join("")}
        </ul>`;
}

// ---------- Load ----------
fetchProjects()
    .then(projects => {
        $("loading").hidden = true;
        renderBars(projects);
        renderDonut(projects);
    })
    .catch(error => {
        console.error("Error loading projects:", error);
        $("loading").textContent = "Couldn't load skills. Please refresh the page.";
    });
