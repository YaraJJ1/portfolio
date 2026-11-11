// Skills page settings. Edit this file to change the bars and the focus chart.

// Skill bars, in the order they appear.
// level: how comfortable you are, from 0 to 100 (it sets the bar length).
// Names and colours come from projects-data.js (TECH), so use the same keys.
export const SKILLS = [
    { key: "unity", level: 85 },
    { key: "c#",    level: 85 },
    { key: "hlsl",  level: 60 },
    { key: "js",    level: 65 },
    { key: "html",  level: 70 },
    { key: "css",   level: 70 }
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
