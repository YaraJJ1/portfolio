import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { EXTRA_SKILLS, LEVEL_ADJUST, TOOLBELT, AREAS, DEFAULT_AREA, DEVICON_BASE } from "./skills-data.js";
import { CERTIFICATES } from "./certificates-data.js";

export const SITE_DOC_ID = "_site";
export const siteDocRef = () => doc(db, "projects", SITE_DOC_ID);

export const LOGOS = {
    csharp:     { label: "C#",           icon: "csharp/csharp-original" },
    unity:      { label: "Unity",        icon: "unity/unity-original", mono: true },
    cplusplus:  { label: "C++",          icon: "cplusplus/cplusplus-original" },
    javascript: { label: "JavaScript",   icon: "javascript/javascript-original", square: true },
    typescript: { label: "TypeScript",   icon: "typescript/typescript-original", square: true },
    java:       { label: "Java",         icon: "java/java-original" },
    python:     { label: "Python",       icon: "python/python-original" },
    html:       { label: "HTML",         icon: "html5/html5-original" },
    css:        { label: "CSS",          icon: "css3/css3-original" },
    git:        { label: "Git",          icon: "git/git-original" },
    github:     { label: "GitHub",       icon: "github/github-original", mono: true },
    vscode:     { label: "VS Code",      icon: "vscode/vscode-original" },
    visualstudio: { label: "Visual Studio", icon: "visualstudio/visualstudio-original" },
    firebase:   { label: "Firebase",     icon: "firebase/firebase-original" },
    blender:    { label: "Blender",      icon: "blender/blender-original" },
    unreal:     { label: "Unreal Engine", icon: "unrealengine/unrealengine-original", mono: true },
    godot:      { label: "Godot",        icon: "godot/godot-original" }
};
export const BADGE_COLORS = ["#6d5a91", "#56707a", "#2b6f75", "#4862d4", "#ad3a5a", "#9c6214"];

export function toolbeltItem(t) {
    const logo = LOGOS[t.logo];
    if (logo) return { row: t.row, name: t.name || logo.label, icon: logo.icon, mono: logo.mono, square: logo.square };
    if (t.icon) return t;
    return { row: t.row, name: t.name, badge: t.badge || t.name, color: t.color || BADGE_COLORS[0] };
}
function logoKeyForIcon(icon) {
    return Object.keys(LOGOS).find(k => LOGOS[k].icon === icon) || "";
}
export const iconUrl = icon => DEVICON_BASE + icon + ".svg";

export const DEFAULTS = {
    home: {
        role: "Game developer working in Unity & C#",
        intro: "I like the technical side of games: player movement, physics, shaders and procedural animation. Systems that are hard to get right and obvious when they're wrong.",
        heroProject: "",
        selectedWork: [],
        areasIntro: "Mostly the systems underneath a game: how things move, collide and look.",
        areas: [
            { title: "Gameplay & physics", text: "Movement and vehicle controllers, grappling hooks, and buoyancy that lets objects ride on moving water." },
            { title: "Graphics & shaders", text: "Real-time GPU work in URP and HLSL, like an FFT ocean simulated in compute shaders." },
            { title: "Animation & tools", text: "Procedural animation for multi-legged characters, plus desktop and web tools in JavaScript." }
        ],
        contactTitle: "Hiring, or working on something interesting?",
        contactText: "Email is the quickest way to reach me."
    },
    skills: {
        extraSkills: EXTRA_SKILLS.map(s => ({ key: s.key, level: s.level })),
        adjust: { ...LEVEL_ADJUST },
        toolbelt: TOOLBELT.map(t => t.icon
            ? { row: t.row, name: t.name, logo: logoKeyForIcon(t.icon) }
            : { row: t.row, name: t.name, logo: "", badge: t.badge, color: t.color }),
        areaTexts: Object.fromEntries(AREAS.map(a => [a.key, a.text])),
        defaultArea: DEFAULT_AREA
    },
    certificates: {
        intro: "Courses and certifications.",
        items: CERTIFICATES.map(c => ({ title: c.title, issuer: c.issuer, date: c.date, link: c.link || "", ...(c.image ? { image: c.image } : {}) }))
    },
    contact: {
        intro: "Questions about a project, an opportunity, or just want to say hi? Email is the best way to reach me.",
        email: "janahi.yara@gmail.com",
        github: "YaraJJ1",
        githubLine: "Source code for some of my projects."
    }
};

const isBlank = v => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

function mergePage(defaults, saved) {
    const out = structuredClone(defaults);
    if (!saved || typeof saved !== "object") return out;
    for (const key of Object.keys(saved)) {
        const value = saved[key];
        if (isBlank(value)) continue;
        const def = defaults[key];
        if (Array.isArray(def)) {
            if (!Array.isArray(value)) continue;
            out[key] = key === "areas"
                ? def.map((d, i) => ({
                    title: isBlank(value[i]?.title) ? d.title : value[i].title,
                    text: isBlank(value[i]?.text) ? d.text : value[i].text
                }))
                : value;
        } else if (key === "adjust") {
            if (value && typeof value === "object") out[key] = { ...value };
        } else if (def && typeof def === "object") {
            out[key] = { ...def };
            for (const k of Object.keys(value)) if (!isBlank(value[k])) out[key][k] = value[k];
        } else {
            out[key] = value;
        }
    }
    return out;
}

export function mergeContent(saved) {
    const out = {};
    for (const page of Object.keys(DEFAULTS)) out[page] = mergePage(DEFAULTS[page], saved && saved[page]);
    return out;
}

const CACHE_KEY = "siteContent";

export function cachedContent() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) return mergeContent(JSON.parse(raw));
    } catch (e) {}
    return null;
}

let loading = null;
export function loadContent() {
    if (!loading) {
        loading = getDoc(siteDocRef())
            .then(snap => {
                const saved = snap.exists() ? snap.data() : {};
                try { localStorage.setItem(CACHE_KEY, JSON.stringify(saved)); } catch (e) {}
                return mergeContent(saved);
            })
            .catch(() => cachedContent() || mergeContent({}));
    }
    return loading;
}

const DEFAULT_EMAIL = DEFAULTS.contact.email;
const DEFAULT_GITHUB = DEFAULTS.contact.github;

export function applyContactLinks(content) {
    const { email, github } = content.contact;
    const ghUrl = "https://github.com/" + github;
    document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
        a.href = "mailto:" + email;
        if (a.textContent.trim() === DEFAULT_EMAIL || a.dataset.shown === "email") { a.textContent = email; a.dataset.shown = "email"; }
    });
    document.querySelectorAll(`a[href^="https://github.com/"]`).forEach(a => {
        const href = a.getAttribute("href").replace(/\/$/, "");
        if (href.toLowerCase() !== ("https://github.com/" + DEFAULT_GITHUB).toLowerCase() && a.dataset.gh !== "1") return;
        a.dataset.gh = "1";
        a.href = ghUrl;
        if (/^github\.com\//i.test(a.textContent.trim())) a.textContent = "github.com/" + github;
    });
    document.querySelectorAll("[data-content-email]").forEach(el => { el.textContent = email; });
}

export function applyText(content) {
    document.querySelectorAll("[data-content]").forEach(el => {
        const [page, field] = el.dataset.content.split(".");
        const value = content[page] && content[page][field];
        if (typeof value === "string") el.textContent = value;
    });
}

export function applyAll(content) {
    applyText(content);
    applyContactLinks(content);
}

export function start() {
    const cached = cachedContent();
    if (cached) applyAll(cached);
    return loadContent().then(content => { applyAll(content); return content; });
}
