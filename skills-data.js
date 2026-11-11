// Skills page settings. Edit this file to change the bars and the focus chart.

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

// Skills you have that aren't in a listed project yet. Set the level yourself
// (0–100). Once a project uses one of these, its level comes from the projects.
// Names and colours come from projects-data.js (TECH), so use the same keys.
export const EXTRA_SKILLS = [
    { key: "c++",      level: 60 },
    { key: "java",     level: 60 },
    { key: "assembly", level: 60 }
];

// The word shown next to each bar.
export function levelWord(level) {
    if (level >= 90) return "Expert";
    if (level >= 75) return "Advanced";
    if (level >= 50) return "Comfortable";
    return "Learning";
}

// Areas in the focus chart. Every project goes into the first area whose
// test matches it, so order matters (e.g. the buoyancy project mentions
// "Ocean" but belongs in Physics, which is checked before Graphics).
export const AREAS = [
    {
        key: "tools",
        label: "Apps & tools",
        color: "#b07a1f",
        text: "Desktop and web apps in JavaScript, HTML and CSS.",
        test: p => p.category !== "games"
    },
    {
        key: "physics",
        label: "Physics",
        color: "#3776ab",
        text: "Buoyancy and physics-driven objects on a moving ocean surface.",
        test: p => /buoy|bouy|physics/i.test(p.title)
    },
    {
        key: "animation",
        label: "Animation",
        color: "#ad3a5a",
        text: "Procedural animation: legs and bodies driven by code instead of keyframes.",
        test: p => /animation|rig|ik\b/i.test(p.title)
    },
    {
        key: "graphics",
        label: "Graphics",
        color: "#6d5a91",
        text: "Real-time GPU work in Unity URP with compute shaders and HLSL.",
        test: p => p.techs.includes("hlsl") || /shader|render|ocean/i.test(p.title)
    },
    {
        key: "gameplay",
        label: "Gameplay",
        color: "#2b8a8a",
        text: "Player and vehicle controllers and physics-based movement like grappling hooks.",
        test: () => true // any other game project
    }
];
