// Shared project data + small helpers used by the Projects, Home and Skills pages.
import { db } from "./firebase.js";
import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

export const CATEGORY_LABELS = {
    games: "Games",
    web: "Web",
    backend: "Back-end",
    others: "Other"
};

export const CATEGORY_COLORS = {
    games: "#2b6f75",
    web: "#4862d4",
    backend: "#8a5a3c",
    others: "#6a606c"
};

export const DIFFICULTY_ORDER = { easy: 1, medium: 2, hard: 3 };

// Label + tag colour for each technology.
export const TECH = {
    html:       { label: "HTML",       color: "#b0533a" },
    css:        { label: "CSS",        color: "#4862d4" },
    js:         { label: "JavaScript", color: "#8a6d0f" },
    javascript: { label: "JavaScript", color: "#8a6d0f" },
    ts:         { label: "TypeScript", color: "#3178c6" },
    typescript: { label: "TypeScript", color: "#3178c6" },
    java:       { label: "Java",       color: "#76589a" },
    "c++":      { label: "C++",        color: "#9a5f8b" },
    "c#":       { label: "C#",         color: "#367d61" },
    python:     { label: "Python",     color: "#3776ab" },
    unity:      { label: "Unity",      color: "#4b4b55" },
    php:        { label: "PHP",        color: "#486552" },
    sql:        { label: "SQL",        color: "#a55a40" },
    hlsl:       { label: "HLSL",       color: "#6d5a91" }
};

export const PLACEHOLDER_IMG = "images.png";

export function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export const capitalize = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
export const techLabel = key => (TECH[key] ? TECH[key].label : key.toUpperCase());
export const techColor = key => (TECH[key] ? TECH[key].color : "#6f6873");

// Dates are stored as dd/mm/yyyy.
function parseDate(str) {
    if (!str) return new Date(0);
    const [day, month, year] = str.split("/").map(Number);
    const d = new Date(year, (month || 1) - 1, day || 1);
    return isNaN(d) ? new Date(0) : d;
}

export function formatDate(date, long = false) {
    if (!date || date.getTime() === 0) return "";
    return date.toLocaleDateString("en-GB", long
        ? { day: "numeric", month: "long", year: "numeric" }
        : { month: "long", year: "numeric" });
}

export function tag(text, color, extraClass = "") {
    return `<span class="tag ${extraClass}" style="--tag:${color}">${escapeHTML(text)}</span>`;
}

// Difficulty as signal bars only (1 = easy, 2 = medium, 3 = hard).
// The word stays available to screen readers and as a hover tooltip.
export function levelTag(p) {
    if (!p.difficulty) return "";
    const label = `${capitalize(p.difficulty)} difficulty`;
    return `<span class="level level-${escapeHTML(p.difficulty)}" role="img" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}">
        <span class="signal" aria-hidden="true"><i></i><i></i><i></i></span>
    </span>`;
}

// Date + difficulty bars, shown under a project title.
export function metaHTML(p, longDate = false) {
    const date = formatDate(p.date, longDate);
    const level = levelTag(p);
    return `${date ? `<span>${escapeHTML(date)}</span>` : ""}${date && level ? `<span class="sep" aria-hidden="true">·</span>` : ""}${level}`;
}

export function tagsHTML(p) {
    const category = tag(CATEGORY_LABELS[p.category] || capitalize(p.category), CATEGORY_COLORS[p.category] || "#6a606c", "category");
    const techs = p.techs.map(t => tag(techLabel(t), techColor(t))).join("");
    return category + techs;
}

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

// Loads every project from Firestore (throws on failure).
export async function fetchProjects() {
    const snapshot = await getDocs(collection(db, "projects"));
    return snapshot.docs.map(doc => normalizeProject(doc.id, doc.data()));
}

// Strongest work first: hardest, then newest.
export function byStrongest(a, b) {
    return (DIFFICULTY_ORDER[b.difficulty] || 0) - (DIFFICULTY_ORDER[a.difficulty] || 0) || b.date - a.date;
}

// "Featured" order: game projects lead (it's a game-dev portfolio), then strongest first.
export function byFeatured(a, b) {
    return (b.category === "games") - (a.category === "games") || byStrongest(a, b);
}
