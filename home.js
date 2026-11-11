// Home page: hero picture, selected work, project links under each area, copy email.
import {
    CATEGORY_COLORS,
    escapeHTML,
    metaHTML,
    tagsHTML,
    techLabel,
    formatDate,
    fetchProjects,
    byFeatured
} from "./projects-data.js";

const $ = id => document.getElementById(id);
const projectUrl = p => `project.html#project=${encodeURIComponent(p.id)}`;

const canPreview = window.matchMedia("(hover: hover) and (pointer: fine)").matches
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Hero picture: the strongest project ----------
function showHero(p) {
    const img = $("heroShotImg");
    img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
    img.src = p.thumb;

    const link = $("heroShotLink");
    link.href = projectUrl(p);
    link.title = [formatDate(p.date), p.techs.map(techLabel).join(", ")].filter(Boolean).join(" · ");
    $("heroShotTitle").textContent = p.title;
    link.hidden = false;
}

// ---------- Quick facts under the intro ----------
function showFacts(projects) {
    const counts = {};
    projects.forEach(p => p.techs.forEach(t => {
        const label = techLabel(t);
        counts[label] = (counts[label] || 0) + 1;
    }));
    const topTech = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 3);
    const latest = [...projects].sort((a, b) => b.date - a.date)[0];

    $("factCount").textContent = projects.length;
    $("factTech").textContent = topTech.join(", ");
    $("factLatest").innerHTML = latest
        ? `<a href="${projectUrl(latest)}">${escapeHTML(latest.title)}</a>`
        : "";
    $("heroFacts").hidden = false;
}

// ---------- Selected work ----------
function workItem(p) {
    const video = p.previewVideo && canPreview
        ? `<video muted loop playsinline preload="none" data-src="${escapeHTML(p.previewVideo)}"></video>`
        : "";
    return `
    <li class="work" style="--cat:${CATEGORY_COLORS[p.category] || "#6a606c"}">
        <a class="work-media" href="${projectUrl(p)}" tabindex="-1" aria-hidden="true">
            <img src="${escapeHTML(p.thumb)}" alt="" loading="lazy">
            ${video}
        </a>
        <div class="work-body">
            <p class="card-meta">${metaHTML(p)}</p>
            <h3 class="work-title"><a href="${projectUrl(p)}">${escapeHTML(p.title)}</a></h3>
            <p class="work-desc">${escapeHTML(p.summary)}</p>
            <div class="tags">${tagsHTML(p)}</div>
            <a class="work-more" href="${projectUrl(p)}" aria-hidden="true" tabindex="-1">Read more &rarr;</a>
        </div>
    </li>`;
}

// Hovering a picture plays the project's clip, if it has one.
function setUpPreviews(list) {
    list.querySelectorAll(".work-media").forEach(media => {
        const video = media.querySelector("video");
        if (!video) return;
        media.addEventListener("mouseenter", () => {
            if (!video.src) video.src = video.dataset.src;
            video.play().then(() => media.classList.add("previewing")).catch(() => {});
        });
        media.addEventListener("mouseleave", () => {
            media.classList.remove("previewing");
            video.pause();
        });
    });
}

// ---------- "Seen in" links under each area ----------
const AREAS = {
    gameplay: p => /grappl|ship|buoy|bouy|controller|movement/i.test(p.title),
    graphics: p => p.techs.includes("hlsl") || /shader|render/i.test(p.title),
    animation: p => /animation/i.test(p.title) || p.category === "web" || p.category === "others"
};

function showAreaLinks(projects) {
    document.querySelectorAll(".area").forEach(area => {
        const match = AREAS[area.dataset.area];
        const found = match ? projects.filter(match) : [];
        const holder = area.querySelector(".area-links");
        if (!found.length) { holder.remove(); return; }
        holder.innerHTML = `<span class="area-links-label">Seen in</span> ` +
            found.map(p => `<a href="${projectUrl(p)}">${escapeHTML(p.title)}</a>`).join(", ");
    });
}

// ---------- Load ----------
fetchProjects()
    .then(projects => {
        $("loading").hidden = true;
        const sorted = [...projects].sort(byFeatured);
        if (!sorted.length) return;

        showHero(sorted[0]);
        showFacts(projects);
        showAreaLinks(sorted);

        const list = $("workList");
        list.innerHTML = sorted.slice(1, 4).map(workItem).join("");
        setUpPreviews(list);
        $("allProjectsLink").innerHTML = `All ${projects.length} projects &rarr;`;
    })
    .catch(error => {
        console.error("Error loading projects:", error);
        $("loading").innerHTML = 'Couldn\'t load projects right now. <a href="project.html">Try the projects page</a>.';
    });

// ---------- Copy email ----------
const toast = $("toast");
let toastTimer;
$("copyEmail").addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText("janahi.yara@gmail.com");
        toast.textContent = "Email address copied";
    } catch (e) {
        toast.textContent = "Couldn't copy. The address is janahi.yara@gmail.com";
    }
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
});
