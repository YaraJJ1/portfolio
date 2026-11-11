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
        key: "tools",
        order: 4,
        label: "Tools & apps",
        color: "#b07a1f",
        text: "Software beyond the game itself: web apps, desktop tools and editor utilities.",
        test: p => p.category !== "games" || /\b(tool|editor|plugin|pipeline)s?\b/i.test(p.title)
    },
    {
        key: "animation",
        order: 3,
        label: "Animation",
        color: "#ad3a5a",
        text: "Runtime animation systems driven from code, such as procedural locomotion, IK and rigs.",
        test: p => /anim|\brig\b|\bik\b|kinematic|locomotion|gait/i.test(p.title)
    },
    {
        key: "graphics",
        order: 2,
        label: "Graphics",
        color: "#6d5a91",
        text: "Real-time rendering: shaders, GPU compute and visual effects.",
        test: p => p.techs.some(t => /hlsl|glsl|shader|compute/i.test(t)) ||
            /shader|render|vfx|lighting|post.?process|ray.?(march|trac)|toon|cel.?shad/i.test(p.title)
    },
    {
        key: "gameplay",
        order: 1,
        label: "Gameplay",
        color: "#2b8a8a",
        text: "Player controllers, movement and physics-driven mechanics built in Unity and C#.",
        test: () => true
    }
];

export const DEFAULT_AREA = "gameplay";
