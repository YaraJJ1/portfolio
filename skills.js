// Skills page: list every technology used across the projects,
// most-used first, with links to the projects that use it.
import {
    escapeHTML,
    techLabel,
    techColor,
    fetchProjects,
    byStrongest
} from "./projects-data.js";

const list = document.getElementById("skillList");
const loading = document.getElementById("loading");

function render(projects) {
    // Group projects by technology label (so "js" and "javascript" merge).
    const groups = new Map();
    projects.sort(byStrongest).forEach(p => {
        p.techs.forEach(key => {
            const label = techLabel(key);
            if (!groups.has(label)) groups.set(label, { label, color: techColor(key), projects: [] });
            const g = groups.get(label);
            if (!g.projects.includes(p)) g.projects.push(p);
        });
    });

    const sorted = [...groups.values()].sort((a, b) => b.projects.length - a.projects.length || a.label.localeCompare(b.label));
    const max = sorted.length ? sorted[0].projects.length : 1;

    list.innerHTML = sorted.map(g => `
        <li class="skill" style="--tag:${g.color}">
            <div class="skill-head">
                <span class="tag">${escapeHTML(g.label)}</span>
                <span class="skill-count">${g.projects.length} project${g.projects.length === 1 ? "" : "s"}</span>
            </div>
            <div class="skill-meter" aria-hidden="true"><span style="width:${Math.round((g.projects.length / max) * 100)}%"></span></div>
            <p class="skill-projects">
                ${g.projects.map(p => `<a href="project.html#project=${encodeURIComponent(p.id)}">${escapeHTML(p.title)}</a>`).join(", ")}
            </p>
        </li>`).join("");
}

fetchProjects()
    .then(projects => {
        loading.hidden = true;
        render(projects);
    })
    .catch(error => {
        console.error("Error loading projects:", error);
        loading.textContent = "Couldn't load skills. Please refresh the page.";
    });
