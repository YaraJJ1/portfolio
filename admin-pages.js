// Admin: the Home, Skills, Certificates and Contact tabs.
// Text is saved in one Firestore document (projects/_site); each tab saves
// only its own part, so tabs never overwrite each other.
import { db } from "./firebase.js";
import {
    collection, getDocs, getDoc, setDoc, deleteField
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { escapeHTML, techLabel, DIFFICULTY_ORDER, TECH } from "./projects-data.js";
import { DIFFICULTY_WEIGHT, levelFromProjects, levelWord, AREAS } from "./skills-data.js";
import { DEFAULTS, LOGOS, BADGE_COLORS, siteDocRef, mergeContent } from "./site-content.js";

const $ = id => document.getElementById(id);
const esc = escapeHTML;

const PAGES = {
    home:         { title: "Home page",    view: "index.html",        intro: "The words on your front page." },
    skills:       { title: "Skills page",  view: "skills.html",       intro: "Skill levels, the scrolling logos and the Focus chart." },
    certificates: { title: "Certificates", view: "certificates.html", intro: "Courses and certifications you want to show." },
    contact:      { title: "Contact",      view: "contact.html",      intro: "How people reach you. The email is used on every page." }
};

let saved = {};          // raw saved document
let projects = [];       // for the "pictured project" list and skill nudges
let current = "projects";
let cleanState = "";     // form state when the tab was opened or last saved
let started = false;
let loadFailed = false;  // couldn't read saved text: block saving so nothing gets overwritten
let saving = false;
let uidCount = 0;
const uid = () => "pf" + (++uidCount);
const COLOR_NAMES = { "#6d5a91": "Purple", "#56707a": "Slate", "#2b6f75": "Teal", "#4862d4": "Blue", "#ad3a5a": "Rose", "#9c6214": "Amber" };

// ---------- Small helpers ----------
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const NUDGES = [
    { value: -6, label: "Lower" },
    { value: -3, label: "A bit lower" },
    { value: 0,  label: "Automatic" },
    { value: 3,  label: "A bit higher" },
    { value: 6,  label: "Higher" }
];

function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 3200);
}
function showNotice(message) {
    const n = $("pageNotice");
    n.querySelector(".notice-text").textContent = message;
    n.hidden = false;
}
function hideNotice() { $("pageNotice").hidden = true; }
$("pageNotice").querySelector(".notice-close").addEventListener("click", hideNotice);

function textField(name, label, value, def, { hint = "", max = 0, rows = 0, type = "text", required = false } = {}) {
    const id = uid();
    const describedBy = [max ? id + "-count" : "", id + "-err"].filter(Boolean).join(" ");
    const attrs = `id="${id}" name="${name}" ${max ? `maxlength="${max}"` : ""} placeholder="${esc(def)}" ${required ? "required" : ""} aria-describedby="${describedBy}"`;
    const control = rows
        ? `<textarea ${attrs} rows="${rows}">${esc(value)}</textarea>`
        : `<input type="${type}" ${attrs} value="${esc(value)}">`;
    return `
    <div class="field" data-default="${esc(def)}">
        <div class="field-label-row">
            <label class="field-label" for="${id}">${esc(label)}${hint ? ` <span class="hint">${esc(hint)}</span>` : ""}</label>
            <button type="button" class="reset-link" hidden aria-label="Reset ${esc(label)} to the built-in text">Reset</button>
        </div>
        ${control}
        ${max ? `<span class="char-count" id="${id}-count"></span>` : ""}
        <span class="field-error" id="${id}-err" hidden></span>
    </div>`;
}

function section(title, help, body) {
    return `<section class="form-section"><h3>${esc(title)}</h3>${help ? `<p class="section-help">${esc(help)}</p>` : ""}${body}</section>`;
}

// ---------- Forms ----------
function homeForm(c) {
    const d = DEFAULTS.home;
    const options = [`<option value="">Automatic (your top project)</option>`]
        .concat(projects.map(p => `<option value="${esc(p.id)}" ${p.id === c.heroProject ? "selected" : ""}>${esc(p.title)}</option>`));
    return section("Top banner", "The big picture at the top of your home page.",
        textField("role", "Line above your name", c.role, d.role, { max: 80 }) +
        textField("intro", "Intro", c.intro, d.intro, { max: 300, rows: 3, hint: "One or two sentences about what you do." }) +
        `<label class="field"><span class="field-label">Pictured project <span class="hint">Its first image fills the banner.</span></span>
            <select name="heroProject">${options.join("")}</select></label>`
    ) + section("Selected work", "The three projects shown under the banner. Leave a slot on Automatic to fill it with your strongest remaining work.",
        [0, 1, 2].map(i => {
            const pick = (c.selectedWork || [])[i] || "";
            const opts = [`<option value="">Automatic</option>`]
                .concat(projects.map(p => `<option value="${esc(p.id)}" ${p.id === pick ? "selected" : ""}>${esc(p.title)}</option>`));
            return `<label class="field"><span class="field-label">${["First", "Second", "Third"][i]} project</span>
                <select name="selectedWork${i}">${opts.join("")}</select></label>`;
        }).join("") +
        `<p class="section-help" style="margin-top:4px">If a slot repeats another slot or the pictured project, it fills automatically instead.</p>`
    ) + section("What I work on", "Three short cards. The link to your skills page is added automatically.",
        textField("areasIntro", "Section intro", c.areasIntro, d.areasIntro, { max: 200, rows: 2 }) +
        c.areas.map((a, i) => `
            <div class="sub-card">
                <p class="sub-card-title">Card ${i + 1}</p>
                ${textField(`areaTitle${i}`, "Title", a.title, d.areas[i].title, { max: 40 })}
                ${textField(`areaText${i}`, "Description", a.text, d.areas[i].text, { max: 160, rows: 2 })}
            </div>`).join("")
    ) + section("Contact block", "At the bottom of the home page, above your email.",
        textField("contactTitle", "Heading", c.contactTitle, d.contactTitle, { max: 80 }) +
        textField("contactText", "Line under it", c.contactText, d.contactText, { max: 120 })
    );
}

function projectSkills() {
    // Every technology used in a project, with its calculated level.
    const map = new Map();
    projects.forEach(p => p.techs.forEach(key => {
        const label = techLabel(key);
        const s = map.get(label) || { label, score: 0, used: 0 };
        s.score += DIFFICULTY_WEIGHT[p.difficulty] || 1;
        s.used += 1;
        map.set(label, s);
    }));
    return [...map.values()].map(s => ({ ...s, level: levelFromProjects(s.score) }))
        .sort((a, b) => b.level - a.level || a.label.localeCompare(b.label));
}

function extraRow(s, i) {
    const level = Number(s.level) || 0;
    const name = s.name || (s.key ? techLabel(s.key) : "");
    return `
    <div class="list-row" data-row="extra">
        <input class="row-name" type="text" name="extraName${i}" value="${esc(name)}" placeholder="Skill name" aria-label="Skill name">
        <input class="row-slider" type="range" min="0" max="100" step="1" name="extraLevel${i}" value="${level}" aria-label="Level for ${esc(name || "this skill")}" aria-valuetext="${esc(levelWord(level))} (${level})">
        <span class="word-chip">${esc(levelWord(level))}</span>
        <button type="button" class="icon-btn" data-remove aria-label="Remove ${esc(name || "this skill")}">✕</button>
    </div>`;
}

function logoOptions(selected) {
    return Object.entries(LOGOS).map(([k, l]) => `<option value="${k}" ${k === selected ? "selected" : ""}>Logo: ${esc(l.label)}</option>`).join("")
        + `<option value="" ${!selected ? "selected" : ""}>No logo (show text)</option>`;
}

function beltRow(t, i) {
    const isBadge = !LOGOS[t.logo];
    return `
    <div class="list-row belt-row-edit" data-row="belt">
        <input class="row-name" type="text" name="beltName${i}" value="${esc(t.name)}" placeholder="Name shown on the page" aria-label="Name shown on the page">
        <select name="beltLogo${i}" aria-label="Logo for ${esc(t.name || "this item")}">${logoOptions(isBadge ? "" : t.logo)}</select>
        <span class="badge-fields" ${isBadge ? "" : "hidden"}>
            <span class="hint">Badge:</span>
            <input type="text" name="beltBadge${i}" value="${esc(t.badge || "")}" maxlength="5" placeholder="Text" aria-label="Badge text" class="badge-text">
            <span class="swatches" role="radiogroup" aria-label="Badge colour">
                ${BADGE_COLORS.map(col => `<label class="swatch" style="--sw:${col}"><input type="radio" name="beltColor${i}" value="${col}" ${col === (t.color || BADGE_COLORS[0]) ? "checked" : ""}><span class="sr-only">${COLOR_NAMES[col] || col}</span></label>`).join("")}
            </span>
        </span>
        <select name="beltRow${i}" aria-label="Row for ${esc(t.name || "this item")}" class="row-select">
            <option value="1" ${Number(t.row) !== 2 ? "selected" : ""}>Top row</option>
            <option value="2" ${Number(t.row) === 2 ? "selected" : ""}>Bottom row</option>
        </select>
        <span class="row-move">
            <button type="button" class="icon-btn" data-up aria-label="Move ${esc(t.name || "this item")} up">↑</button>
            <button type="button" class="icon-btn" data-down aria-label="Move ${esc(t.name || "this item")} down">↓</button>
            <button type="button" class="icon-btn" data-remove aria-label="Remove ${esc(t.name || "this item")}">✕</button>
        </span>
    </div>`;
}

function skillsForm(c) {
    const fromProjects = projectSkills();
    const extras = c.extraSkills.map(s => ({ ...s, name: s.name || techLabel(s.key) }));
    return section("Extra skills",
        "Skills you have but no project shows yet. Drag to set the bar. If a project later uses one, the project decides the bar instead.",
        `<div class="list" id="extraList">${extras.map(extraRow).join("")}</div>
         <button type="button" class="btn btn-ghost btn-small" data-add="extra">+ Add skill</button>`
    ) + section("Fine-tune bars",
        "Your projects decide how full each bar is. If one looks wrong, nudge it.",
        fromProjects.length ? fromProjects.map(s => {
            const cur = Number(c.adjust[s.label]) || 0;
            const options = NUDGES.some(n => n.value === cur) ? NUDGES : [...NUDGES, { value: cur, label: `Custom (${cur > 0 ? "+" : ""}${cur})` }];
            const nearest = options.find(n => n.value === cur);
            return `
            <fieldset class="nudge-row">
                <legend>${esc(s.label)} <span class="hint">from your projects: ${esc(levelWord(s.level))}</span></legend>
                <div class="segmented">
                    ${options.map(n => `<label><input type="radio" name="adjust:${esc(s.label)}" value="${n.value}" ${n === nearest ? "checked" : ""}><span>${esc(n.label)}</span></label>`).join("")}
                </div>
            </fieldset>`;
        }).join("") : `<p class="section-help">${projects.length ? "None of your projects list a language or tool yet." : "Add a project on the Projects tab and its skills will appear here."}</p>`
    ) + section("Scrolling logos",
        "The two rows of logos under the page title. The top row moves left, the bottom row moves right.",
        `<div class="list" id="beltList">${c.toolbelt.map(beltRow).join("")}</div>
         <div class="list-actions">
            <button type="button" class="btn btn-ghost btn-small" data-add="belt">+ Add logo</button>
            <button type="button" class="link-btn" data-reset-list="belt">Reset list</button>
         </div>`
    ) + section("Focus chart", "What each area says when someone selects it.",
        AREAS.map(a => textField(`area:${a.key}`, a.label, c.areaTexts[a.key] || "", DEFAULTS.skills.areaTexts[a.key] || "", { max: 200, rows: 2 })).join("") +
        `<label class="field"><span class="field-label">Selected when the page opens</span>
            <select name="defaultArea">${AREAS.map(a => `<option value="${a.key}" ${a.key === c.defaultArea ? "selected" : ""}>${esc(a.label)}</option>`).join("")}</select></label>`
    );
}

function certRow(cert, i) {
    const [y, m] = String(cert.date || "").split("-");
    const thisYear = new Date().getFullYear();
    const years = [];
    for (let yr = thisYear + 1; yr >= thisYear - 15; yr--) years.push(yr);
    if (Number(y) && !years.includes(Number(y))) years.push(Number(y));
    years.sort((a, b) => b - a);
    return `
    <div class="sub-card" data-row="cert" data-image="${esc(cert.image || "")}">
        <div class="sub-card-head">
            <p class="sub-card-title">Certificate</p>
            <button type="button" class="link-btn" data-remove="cert">Remove</button>
        </div>
        ${textField(`certTitle${i}`, "Title", cert.title || "", "", { max: 120, required: true })}
        ${textField(`certIssuer${i}`, "Issued by", cert.issuer || "", "", { max: 80, required: true })}
        <div class="field-row two">
            <label class="field"><span class="field-label">Month</span>
                <select name="certMonth${i}"><option value="">Month…</option>${MONTHS.map((mn, k) => `<option value="${String(k + 1).padStart(2, "0")}" ${Number(m) === k + 1 ? "selected" : ""}>${mn}</option>`).join("")}</select></label>
            <label class="field"><span class="field-label">Year</span>
                <select name="certYear${i}"><option value="">Year…</option>${years.map(yr => `<option ${Number(y) === yr ? "selected" : ""}>${yr}</option>`).join("")}</select></label>
        </div>
        ${textField(`certLink${i}`, "Link to verify", cert.link || "", "", { type: "url", hint: "Optional. Must start with https://" })}
    </div>`;
}

function certificatesForm(c) {
    return section("Page intro", "",
        textField("intro", "Line under the title", c.intro, DEFAULTS.certificates.intro, { max: 160 })
    ) + section("Your certificates", "The page lists them newest first, by the date you pick.",
        `<div class="list" id="certList">${c.items.map(certRow).join("")}</div>
         <p class="section-help empty-note" id="certEmptyNote" ${c.items.length ? "hidden" : ""}>No certificates yet. The page shows "Coming soon".</p>
         <button type="button" class="btn btn-ghost btn-small" data-add="cert">+ Add certificate</button>`
    );
}

function contactForm(c) {
    const d = DEFAULTS.contact;
    return section("Contact details", "",
        textField("intro", "Intro on the Contact page", c.intro, d.intro, { max: 250, rows: 3 }) +
        textField("email", "Email", c.email, d.email, { type: "email", required: true, hint: "Used everywhere: home, contact page, footer and copy buttons." }) +
        textField("github", "GitHub username", c.github, d.github, { hint: "e.g. YaraJJ1 — the link is made from it." }) +
        textField("githubLine", "Line on the GitHub card", c.githubLine, d.githubLine, { max: 100 })
    );
}

const FORMS = { home: homeForm, skills: skillsForm, certificates: certificatesForm, contact: contactForm };

// ---------- Reading the form back ----------
const val = (form, name) => (form.elements[name] ? String(form.elements[name].value) : "");
// Store "" when a field matches the built-in text, so later default updates still show.
const orBlank = (value, def) => (value.trim() === String(def).trim() ? "" : value.trim());

function readForm(page) {
    const f = $("pageForm");
    if (page === "home") {
        const d = DEFAULTS.home;
        return {
            role: orBlank(val(f, "role"), d.role),
            intro: orBlank(val(f, "intro"), d.intro),
            heroProject: val(f, "heroProject"),
            selectedWork: (() => {
                const picks = [0, 1, 2].map(i => val(f, `selectedWork${i}`));
                return picks.some(Boolean) ? picks : [];
            })(),
            areasIntro: orBlank(val(f, "areasIntro"), d.areasIntro),
            areas: d.areas.map((a, i) => ({
                title: orBlank(val(f, `areaTitle${i}`), a.title),
                text: orBlank(val(f, `areaText${i}`), a.text)
            })),
            contactTitle: orBlank(val(f, "contactTitle"), d.contactTitle),
            contactText: orBlank(val(f, "contactText"), d.contactText)
        };
    }
    if (page === "skills") {
        const extras = [...f.querySelectorAll('[data-row="extra"]')].map(row => {
            const name = row.querySelector(".row-name").value.trim();
            const known = Object.keys(TECH).find(k => TECH[k].label.toLowerCase() === name.toLowerCase());
            return { key: known || name.toLowerCase(), name, level: Number(row.querySelector(".row-slider").value) };
        }).filter(s => s.name);
        // Start from the saved nudges so ones without a row here are kept.
        const adjust = { ...mergeContent(saved).skills.adjust };
        f.querySelectorAll(".nudge-row input:checked").forEach(r => {
            const label = r.name.slice("adjust:".length);
            const v = Number(r.value);
            if (v) adjust[label] = v; else delete adjust[label];
        });
        const toolbelt = [...f.querySelectorAll('[data-row="belt"]')].map(row => {
            const logo = row.querySelector('select[name^="beltLogo"]').value;
            const name = row.querySelector(".row-name").value.trim();
            const item = { row: Number(row.querySelector(".row-select").value), name, logo };
            if (!logo) {
                item.badge = row.querySelector(".badge-text").value.trim() || name.slice(0, 4).toUpperCase();
                item.color = (row.querySelector('.swatches input:checked') || {}).value || BADGE_COLORS[0];
            }
            return item;
        }).filter(t => t.name);
        const areaTexts = {};
        AREAS.forEach(a => { areaTexts[a.key] = orBlank(val(f, `area:${a.key}`), DEFAULTS.skills.areaTexts[a.key] || ""); });
        return { extraSkills: extras, adjust, toolbelt, areaTexts, defaultArea: val(f, "defaultArea") };
    }
    if (page === "certificates") {
        const items = [...f.querySelectorAll('[data-row="cert"]')].map(card => {
            const get = prefix => (card.querySelector(`[name^="${prefix}"]`) || {}).value || "";
            const y = get("certYear"), m = get("certMonth");
            const item = {
                title: get("certTitle").trim(),
                issuer: get("certIssuer").trim(),
                date: y ? (m ? `${y}-${m}` : y) : "",
                link: get("certLink").trim()
            };
            if (card.dataset.image) item.image = card.dataset.image;
            return item;
        });
        return { intro: orBlank(val(f, "intro"), DEFAULTS.certificates.intro), items };
    }
    if (page === "contact") {
        const d = DEFAULTS.contact;
        return {
            intro: orBlank(val(f, "intro"), d.intro),
            email: orBlank(val(f, "email"), d.email),
            github: orBlank(val(f, "github").replace(/^@/, "").replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, ""), d.github),
            githubLine: orBlank(val(f, "githubLine"), d.githubLine)
        };
    }
    return {};
}

// ---------- Checking before saving ----------
function setError(input, message) {
    const field = input.closest(".field");
    const err = field && field.querySelector(".field-error");
    input.classList.toggle("is-missing", !!message);
    if (message) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
    if (err) { err.textContent = message || ""; err.hidden = !message; }
    return !message;
}

function validate(page) {
    const f = $("pageForm");
    let first = null;
    const check = (input, message) => { if (!setError(input, message) && !first) first = input; };
    f.querySelectorAll(".is-missing").forEach(el => setError(el, ""));

    if (page === "contact") {
        const email = f.elements.email;
        if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) check(email, "Enter a full email address, like name@example.com");
        const gh = f.elements.github;
        const user = gh.value.trim().replace(/^@/, "").replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, "");
        if (user && !/^[A-Za-z0-9-]{1,39}$/.test(user)) check(gh, "Use just your GitHub username, like YaraJJ1");
    }
    if (page === "certificates") {
        f.querySelectorAll('[data-row="cert"]').forEach(card => {
            const title = card.querySelector('[name^="certTitle"]');
            const issuer = card.querySelector('[name^="certIssuer"]');
            const link = card.querySelector('[name^="certLink"]');
            if (!title.value.trim()) check(title, "Add the certificate's name");
            if (!issuer.value.trim()) check(issuer, "Who issued it?");
            if (link.value.trim() && !/^https:\/\/\S+$/i.test(link.value.trim())) check(link, "Enter a full link starting with https://");
            const month = card.querySelector('[name^="certMonth"]');
            const year = card.querySelector('[name^="certYear"]');
            if (month.value && !year.value) check(year, "Pick a year too, or clear the month");
        });
    }
    if (first) {
        first.scrollIntoView({ behavior: "smooth", block: "center" });
        first.focus({ preventScroll: true });
        return false;
    }
    return true;
}

// ---------- Unsaved changes ----------
const formState = () => JSON.stringify(readForm(current));
const isDirty = () => current !== "projects" && cleanState !== "" && formState() !== cleanState;

function updateSaveBar() {
    const dirty = isDirty();
    $("saveBtn").disabled = !dirty || !started || loadFailed || saving;
    $("discardBtn").disabled = !dirty || saving;
    $("discardBtn").hidden = !dirty;
    $("saveBar").classList.toggle("is-dirty", dirty);
    $("saveStateText").textContent = dirty ? "Unsaved changes" : "Saved – live on your site";
    document.querySelectorAll(".admin-tab").forEach(t =>
        t.classList.toggle("has-changes", dirty && t.dataset.tab === current));
}

// Ctrl/Cmd + S saves the open page.
document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && current !== "projects") {
        e.preventDefault();
        if (!$("saveBtn").disabled) $("saveBtn").click();
    }
});

// Per-field "Reset" link + character counters.
function refreshFieldHelpers(scope) {
    (scope || $("pageForm")).querySelectorAll(".field[data-default]").forEach(field => {
        const input = field.querySelector("input, textarea");
        const def = field.dataset.default;
        const reset = field.querySelector(".reset-link");
        if (reset) reset.hidden = !def || input.value.trim() === def.trim() || input.value.trim() === "";
        const count = field.querySelector(".char-count");
        if (count && input.maxLength > 0) count.textContent = `${input.value.length} / ${input.maxLength}`;
    });
}

// ---------- Rendering a tab ----------
function renderPage(page) {
    const meta = PAGES[page];
    $("pageTitle").textContent = meta.title;
    $("pageIntro").textContent = meta.intro;
    $("pageViewLink").href = meta.view;
    hideNotice();
    const content = mergeContent(saved)[page];
    const form = $("pageForm");
    form.innerHTML = FORMS[page](content);
    $("pageLoading").hidden = true;
    if (!started) showNotice("Still loading your saved text… Saving is switched on once it's loaded.");
    if (loadFailed) showNotice("Couldn't load your saved text, so this page shows the built-in wording. Don't save — refresh the page to try again.");
    $("restoreBtn").disabled = !started || loadFailed || !saved[page];
    refreshFieldHelpers();
    cleanState = formState();
    updateSaveBar();
}

// ---------- Tabs ----------
function setTab(tab, { pushHash = true } = {}) {
    if (!PAGES[tab] && tab !== "projects") tab = "projects";
    if (tab !== current && isDirty()) {
        const leave = confirm(`You have unsaved changes on ${PAGES[current].title}. Leave without saving?`);
        if (!leave) return false;
    }
    current = tab;
    document.querySelectorAll(".admin-tab").forEach(btn => {
        const on = btn.dataset.tab === tab;
        btn.setAttribute("aria-selected", String(on));
        btn.tabIndex = on ? 0 : -1;
    });
    $("panel-projects").hidden = tab !== "projects";
    $("panel-pages").hidden = tab === "projects";
    $("panel-pages").setAttribute("aria-labelledby", "tab-" + tab);
    $("saveBar").hidden = tab === "projects";
    if (tab !== "projects") renderPage(tab);
    if (pushHash) history.replaceState(null, "", tab === "projects" ? location.pathname : "#" + tab);
    window.scrollTo(0, 0);
    return true;
}

document.querySelectorAll(".admin-tab").forEach(btn => {
    btn.addEventListener("click", () => {
        if (!setTab(btn.dataset.tab)) {
            const selected = document.querySelector('.admin-tab[aria-selected="true"]');
            if (selected) selected.focus();
        }
    });
    btn.addEventListener("keydown", e => {
        const tabs = [...document.querySelectorAll(".admin-tab")];
        const i = tabs.indexOf(btn);
        let next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") next = tabs[0];
        if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) {
            e.preventDefault();
            tabs.forEach(t => { t.tabIndex = t === next ? 0 : -1; });
            next.focus();
        }
    });
});

// ---------- Editing inside the form ----------
const form = $("pageForm");
form.addEventListener("submit", e => e.preventDefault());

form.addEventListener("input", e => {
    const t = e.target;
    if (t.classList.contains("row-slider")) {
        t.closest(".list-row").querySelector(".word-chip").textContent = levelWord(Number(t.value));
        t.setAttribute("aria-valuetext", `${levelWord(Number(t.value))} (${t.value})`);
    }
    if (t.classList.contains("is-missing")) setError(t, "");
    refreshFieldHelpers();
    updateSaveBar();
});
form.addEventListener("change", e => {
    const t = e.target;
    if (t.matches('select[name^="beltLogo"]')) {
        const row = t.closest(".list-row");
        row.querySelector(".badge-fields").hidden = !!t.value;
        const name = row.querySelector(".row-name");
        if (t.value && !name.value.trim()) name.value = LOGOS[t.value].label;
    }
    updateSaveBar();
});

// Renumber field names after adding/removing/moving rows so they stay unique.
// Two passes: radio buttons sharing a name for even a moment would lose
// their checked state, so give everything a temporary name first.
function renumber(list) {
    const rows = [...list.children];
    rows.forEach((row, i) => row.querySelectorAll("[name]").forEach(el => {
        el.name = el.name.replace(/\d+$/, "") + "__tmp" + i;
    }));
    rows.forEach((row, i) => row.querySelectorAll("[name]").forEach(el => {
        el.name = el.name.replace(/__tmp\d+$/, String(i));
    }));
}

form.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const row = btn.closest("[data-row]");

    if (btn.classList.contains("reset-link")) {
        const field = btn.closest(".field");
        const input = field.querySelector("input, textarea");
        input.value = field.dataset.default;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
        return;
    }
    if (btn.dataset.add) {
        const kind = btn.dataset.add;
        const list = kind === "extra" ? $("extraList") : kind === "belt" ? $("beltList") : $("certList");
        const i = list.children.length;
        const html = kind === "extra" ? extraRow({ name: "", level: 50 }, i)
            : kind === "belt" ? beltRow({ row: 1, name: "", logo: "" }, i)
            : certRow({}, i);
        list.insertAdjacentHTML(kind === "cert" ? "afterbegin" : "beforeend", html);
        if (kind === "cert") renumber(list);
        const added = kind === "cert" ? list.firstElementChild : list.lastElementChild;
        refreshFieldHelpers(added);
        if ($("certEmptyNote")) $("certEmptyNote").hidden = !!$("certList").children.length;
        (added.querySelector("input") || added).focus();
        updateSaveBar();
        return;
    }
    if (btn.dataset.resetList === "belt") {
        if (!confirm("Put the scrolling logos back to the original list?")) return;
        $("beltList").innerHTML = DEFAULTS.skills.toolbelt.map(beltRow).join("");
        updateSaveBar();
        return;
    }
    if (!row) return;
    const list = row.parentElement;
    if (btn.hasAttribute("data-remove")) {
        if (row.dataset.row === "cert") {
            const title = (row.querySelector('[name^="certTitle"]') || {}).value || "";
            if (!confirm(`Remove "${title.trim() || "this certificate"}"? It goes from your site when you save.`)) return;
        }
        const neighbour = row.nextElementSibling || row.previousElementSibling;
        row.remove();
        renumber(list);
        if ($("certEmptyNote")) $("certEmptyNote").hidden = !!$("certList").children.length;
        const focusTarget = neighbour ? neighbour.querySelector("[data-remove]") : list.parentElement.querySelector("[data-add]");
        if (focusTarget) focusTarget.focus();
    } else if (btn.hasAttribute("data-up") && row.previousElementSibling) {
        list.insertBefore(row, row.previousElementSibling);
        renumber(list);
        btn.focus();
    } else if (btn.hasAttribute("data-down") && row.nextElementSibling) {
        list.insertBefore(row.nextElementSibling, row);
        renumber(list);
        btn.focus();
    }
    updateSaveBar();
});

// ---------- Save / discard / restore ----------
function saveErrorMessage(error) {
    if (error && error.code === "permission-denied") {
        return "Couldn't save: your database settings don't allow saving page text. Nothing was changed.";
    }
    return "Couldn't save. Check your connection and try again. Your edits are still here.";
}

$("saveBtn").addEventListener("click", async () => {
    if (!validate(current)) return;
    const page = current;
    const data = readForm(page);
    const snapshot = JSON.stringify(data);
    const btn = $("saveBtn");
    saving = true;
    btn.disabled = true;
    btn.textContent = "Saving…";
    hideNotice();
    try {
        await setDoc(siteDocRef(), { [page]: data }, { mergeFields: [page] });
        saved = { ...saved, [page]: data };
        try { localStorage.setItem("siteContent", JSON.stringify(saved)); } catch (e) {}
        if (current === page) cleanState = snapshot;
        $("restoreBtn").disabled = false;
        toast(`${PAGES[page].title} saved. Changes are live.`);
    } catch (error) {
        console.error("Save failed:", error);
        showNotice(saveErrorMessage(error));
    } finally {
        saving = false;
        btn.textContent = "Save changes";
        updateSaveBar();
    }
});

$("discardBtn").addEventListener("click", () => {
    if (!confirm("Throw away your unsaved changes on this page?")) return;
    renderPage(current);
});

$("restoreBtn").addEventListener("click", async () => {
    const title = PAGES[current].title;
    const extra = isDirty() ? "\n\nYour unsaved changes will be lost too." : "";
    if (!confirm(`Replace all your text on the ${title} with the built-in wording?\n\nThis changes your live site right away and can't be undone.${extra}`)) return;
    try {
        await setDoc(siteDocRef(), { [current]: deleteField() }, { merge: true });
        const copy = { ...saved };
        delete copy[current];
        saved = copy;
        try { localStorage.setItem("siteContent", JSON.stringify(saved)); } catch (e) {}
        renderPage(current);
        toast(`${title} is back to the original text.`);
    } catch (error) {
        console.error("Restore failed:", error);
        showNotice(saveErrorMessage(error));
    }
});

window.addEventListener("beforeunload", e => {
    if (isDirty()) { e.preventDefault(); e.returnValue = ""; }
});

// Ask before signing out with unsaved changes.
$("logout-btn").addEventListener("click", e => {
    if (isDirty() && !confirm("You have unsaved changes. Sign out anyway?")) {
        e.stopImmediatePropagation();
        e.preventDefault();
    }
}, true);

// ---------- Start once signed in ----------
async function loadData() {
    const [siteSnap, projSnap] = await Promise.all([
        getDoc(siteDocRef()),
        getDocs(collection(db, "projects"))
    ]);
    saved = siteSnap && siteSnap.exists() ? siteSnap.data() : {};
    projects = projSnap.docs
        .filter(d => !d.id.startsWith("_"))
        .map(d => {
            const data = d.data();
            return {
                id: d.id,
                title: data.imgTxt || "Untitled project",
                difficulty: data["data-difficulty"] || "",
                techs: String(data["code-language"] || "").trim().toLowerCase().split(/\s+/).filter(Boolean)
            };
        })
        .sort((a, b) => (DIFFICULTY_ORDER[b.difficulty] || 0) - (DIFFICULTY_ORDER[a.difficulty] || 0) || a.title.localeCompare(b.title));
}

onAuthStateChanged(getAuth(), async user => {
    if (!user) { started = false; return; }
    try {
        await loadData();
        loadFailed = false;
    } catch (error) {
        console.error("Couldn't load page text:", error);
        loadFailed = true;
    }
    started = true;
    const fromHash = location.hash.slice(1);
    const tab = current !== "projects" ? current : (PAGES[fromHash] ? fromHash : "projects");
    if (tab !== "projects" && tab === current && !isDirty()) renderPage(tab);
    else setTab(tab, { pushHash: false });
});
