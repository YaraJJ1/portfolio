// Skills page settings. Edit this file to change the bars, the logo band and the focus chart.

// ----- Skill bars -----
// Every language/tool used in your projects gets a bar automatically.
// Its level comes from those projects: each one adds points by difficulty
// (easy 1, medium 2, hard 3), so more and harder projects = longer bar.
// Adding a project in the admin page updates the bars by itself.
export const DIFFICULTY_WEIGHT = { easy: 1, medium: 2, hard: 3 };

export function levelFromProjects(points) {
    // One easy project ≈ 54, one hard project ≈ 61, five projects with two hard ≈ 85.
    return Math.round(Math.min(92, 50 + points * 3.5));
}

// The word shown next to each bar.
export function levelWord(level) {
    if (level >= 75) return "Advanced";
    if (level >= 58) return "Working knowledge";
    return "Familiar";
}

// Skills you have that aren't in a listed project yet. Set the level yourself
// (0–100). Once a project uses one of these, its level comes from the projects.
// Names and colours come from projects-data.js (TECH), so use the same keys.
export const EXTRA_SKILLS = [
    { key: "c++",      level: 60 },
    { key: "java",     level: 60 },
    { key: "assembly", level: 60 }
];

// When two bars have the same level, this order decides which comes first
// (most relevant for game work first). Uses the display names.
export const SKILL_ORDER = ["C#", "Unity", "HLSL", "C++", "JavaScript", "HTML", "CSS", "Java", "Assembly"];

// ----- Scrolling logo band at the top of the page -----
// row 1 scrolls left, row 2 scrolls right. "icon" is a devicon path
// (see devicon.dev). "mono" logos are black, so they're flipped to white in
// dark mode; "square" logos are drawn a little smaller so they look the same
// size as the others. Skills without a logo get an outlined text badge.
export const TOOLBELT = [
    { row: 1, name: "C#",         icon: "csharp/csharp-original" },
    { row: 1, name: "Unity",      icon: "unity/unity-original", mono: true },
    { row: 1, name: "HLSL",       badge: "HLSL", color: "#6d5a91" },
    { row: 1, name: "C++",        icon: "cplusplus/cplusplus-original" },
    { row: 1, name: "JavaScript", icon: "javascript/javascript-original", square: true },
    { row: 1, name: "Git",        icon: "git/git-original" },
    { row: 1, name: "Java",       icon: "java/java-original" },
    { row: 2, name: "HTML",       icon: "html5/html5-original" },
    { row: 2, name: "VS Code",    icon: "vscode/vscode-original" },
    { row: 2, name: "CSS",        icon: "css3/css3-original" },
    { row: 2, name: "GitHub",     icon: "github/github-original", mono: true },
    { row: 2, name: "Assembly",   badge: "ASM", color: "#56707a" },
    { row: 2, name: "Firebase",   icon: "firebase/firebase-original" }
];
export const DEVICON_BASE = "https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/";

// ----- Focus chart -----
// Every project goes into the first area whose test matches it, so the order
// of this list matters (e.g. the buoyancy project mentions "Ocean" but
// belongs in Physics, which is checked before Graphics).
// "order" is where the area sits on the chart (1 = starting at the top).
export const AREAS = [
    {
        key: "tools",
        order: 5,
        label: "Apps & tools",
        color: "#b07a1f",
        text: "A personal dashboard desktop app built with JavaScript, HTML and CSS.",
        test: p => p.category !== "games"
    },
    {
        key: "physics",
        order: 3,
        label: "Physics",
        color: "#3776ab",
        text: "Buoyancy that makes objects float realistically on the moving FFT ocean.",
        test: p => /buoy|bouy|physics/i.test(p.title)
    },
    {
        key: "animation",
        order: 2,
        label: "Animation",
        color: "#ad3a5a",
        text: "Procedural animation for a multi-legged character: raycasts find the ground, and the legs and body adjust to uneven terrain.",
        test: p => /animation|rig|ik\b/i.test(p.title)
    },
    {
        key: "graphics",
        order: 1,
        label: "Graphics",
        color: "#6d5a91",
        text: "A real-time GPU ocean in Unity URP: Phillips spectrum and a custom inverse FFT, written in HLSL.",
        test: p => p.techs.includes("hlsl") || /shader|render|ocean/i.test(p.title)
    },
    {
        key: "gameplay",
        order: 4,
        label: "Gameplay",
        color: "#2b8a8a",
        text: "Movement prototypes: a spaceship controller and a dual grappling hook.",
        test: () => true // any other game project
    }
];

// The area shown when the page opens (falls back to the biggest one).
export const DEFAULT_AREA = "graphics";
