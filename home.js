// Home page: show the three strongest projects.
import {
    CATEGORY_COLORS,
    escapeHTML,
    metaHTML,
    tagsHTML,
    fetchProjects,
    byStrongest,
    byFeatured
} from "./projects-data.js";

const grid = document.getElementById("featuredGrid");
const loading = document.getElementById("loading");

function featuredCard(p) {
    return `
    <li>
        <a class="card" href="project.html#project=${encodeURIComponent(p.id)}" style="--cat:${CATEGORY_COLORS[p.category] || "#6a606c"}">
            <div class="card-media">
                <img src="${escapeHTML(p.thumb)}" alt="" loading="lazy">
            </div>
            <div class="card-body">
                <h3 class="card-title">${escapeHTML(p.title)}</h3>
                <p class="card-meta">${metaHTML(p)}</p>
                <p class="card-desc clamp">${escapeHTML(p.summary)}</p>
                <div class="tags">${tagsHTML(p)}</div>
            </div>
        </a>
    </li>`;
}

fetchProjects()
    .then(projects => {
        loading.hidden = true;
        grid.innerHTML = projects.sort(byFeatured).slice(0, 3).map(featuredCard).join("");
    })
    .catch(error => {
        console.error("Error loading projects:", error);
        loading.innerHTML = 'Couldn\'t load projects. <a href="project.html">See the projects page</a>.';
    });
