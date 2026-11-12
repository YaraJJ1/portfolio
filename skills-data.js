export const DIFFICULTY_WEIGHT = { easy: 1, medium: 2, hard: 3 };

export function levelFromProjects(points) {
    return Math.round(Math.min(92, 50 + points * 3.5));
}

export function levelWord(level) {
    if (level >= 90) return "Expert";
    if (level >= 75) return "Advanced";
    if (level >= 55) return "Intermediate";
    return "Beginner";
}

export const EXTRA_SKILLS = [
    { key: "c++",      level: 60 },
    { key: "java",     level: 56 },
    { key: "assembly", level: 48 }
];

export const LEVEL_ADJUST = {
    "CSS": -3,
    "JavaScript": -6
};

export const SKILL_ORDER = ["C#", "Unity", "HLSL", "C++", "JavaScript", "HTML", "CSS", "Java", "Assembly"];

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

export const AREAS = [
    {
        key: "games",
        order: 1,
        label: "Games",
        color: "#2b6f75",
        text: "Gameplay systems, graphics and animation built in Unity and C#.",
        test: p => p.category === "games"
    },
    {
        key: "web",
        order: 2,
        label: "Web",
        color: "#4862d4",
        text: "Websites and web apps built with JavaScript, HTML and CSS.",
        test: p => p.category === "web"
    },
    {
        key: "backend",
        order: 3,
        label: "Back-end",
        color: "#8a5a3c",
        text: "Servers, databases and APIs.",
        test: p => p.category === "backend"
    },
    {
        key: "others",
        order: 4,
        label: "Apps & tools",
        color: "#6a606c",
        text: "Desktop apps and tools outside of games and the web.",
        test: () => true
    }
];

export const DEFAULT_AREA = "games";
