import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

let projectCards = [];

async function loadProjects() {

    const projectList = document.querySelector(".project-list");

    if (!projectList) return;

    try {

        const querySnapshot = await getDocs(
            collection(db, "projects")
        );

        querySnapshot.forEach((doc) => {

            const project = doc.data();

            const projectCard = document.createElement("li");

            projectCard.classList.add("project");

            projectCard.setAttribute("data-category",project["data-category"] || "");

            projectCard.setAttribute("data-difficulty",project["data-difficulty"] || "");

            projectCard.setAttribute("data-date",project["data-date"] || "");

            projectCard.setAttribute("code-language", project["code-language"] || "");

            projectCard.setAttribute("data-id",doc.id);

            // Each project can have a Firestore "images" array (multiple screenshots)
            // for the modal slideshow. The first entry doubles as the card thumbnail.
            // Falls back to the old single "imgSrc" field so existing docs still work.
            const images = Array.isArray(project.images) && project.images.length
                ? project.images
                : [project.imgSrc || "images.png"];

            // Stored directly on the element (not a data-attribute) since it's an
            // array of URLs, not a single string - the modal reads it back on click.
            projectCard.images = images;

            projectCard.innerHTML = `
                <img
                    src="${images[0]}"
                    alt="${project.imgTxt || "Project"}"
                >

                <div class="textContainer">

                    <p class="imgtxt">
                        ${project.imgTxt || "Untitled Project"}
                        <span class="date">
                            ● ${project["data-date"] || ""}
                        </span>
                    </p>

                    <p class="imgdesc">
                        ${project.imgDesc || ""}
                    </p>

                    <p hidden class="moreDesc">
                        ${project.imgMoreDesc || ""}
                    </p>

                    <p class="tags">
                        <span class="skillText"></span>
                        <span class="language-container"></span>
                    </p>

                </div>
            `;

            projectList.appendChild(projectCard);
        });

    } catch (error) {

        console.error("Error loading projects:", error);

    } finally {

        // Runs whether the fetch succeeded or failed, and only AFTER
        // any Firestore cards have been appended to the DOM — so
        // initializeProjectSystem() always sees the final, complete
        // set of .project elements (hardcoded + Firestore-loaded).
        projectCards = document.querySelectorAll(".project");
        initializeProjectSystem();

    }
}

loadProjects();



// ---------- Element references ----------
const filterList = document.querySelector('.filter');
const filterButtons = filterList ? filterList.querySelectorAll('.filter-btn') : null;
const projectList = document.querySelector('.project-list');
const sortSelect = document.getElementById("difficultySort");
const totalNumText = document.querySelector('.totalNum');
const numText = document.querySelector(".numOfProjects");
const openBtn = document.getElementById("openBtn");
const popup = document.getElementById("popup");
const checkboxes = document.querySelectorAll(".difficulty-checkbox");
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = modalOverlay ? document.getElementById("modalClose") : null;

let projects = document.querySelectorAll('.project');

const languageStyles = {
    "html":   { label: "HTML",   bg: "#dd7156", text: "#FFFFFF" },
    "css":    { label: "CSS",    bg: "#5f7be9", text: "#FFFFFF" },
    "js":     { label: "JS",     bg: "#55863f", text: "#ffffff" },
    "java":   { label: "Java",   bg: "#866aa5", text: "#FFFFFF" },
    "c++":    { label: "C++",    bg: "#AE759F", text: "#FFFFFF" },
    "c#":     { label: "C#",     bg: "#439775", text: "#FFFFFF" },
    "python": { label: "Python", bg: "#3776AB", text: "#FFFFFF" },
    "unity":  { label: "Unity",  bg: "#37ab62", text: "#FFFFFF" },
    "php":    { label: "PHP",    bg: "#486552", text: "#FFFFFF" },
    "sql":    { label: "SQL",    bg: "#c99082", text: "#FFFFFF" }
};

const skillStyles = {
    "easy":   { bg: "#9B7EDE", text: "#FFFFFF" },
    "medium": { bg: "#7563af", text: "#ffffff" },
    "hard":   { bg: "#c37097", text: "#ffffff" }
};

function convertDate(date) {
    const [day, month, year] = date.split("/");
    return new Date(year, month - 1, day);
}

function updateVisibleCount() {
    if (!totalNumText) return;
    const visibleCount = Array.from(projects).filter(project => {
        return !project.hidden && project.style.display !== 'none';
    }).length;
    totalNumText.textContent = `${visibleCount} Projects`;
}

function filterProjects() {
    if (!checkboxes.length) return;
    const selected = Array.from(checkboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);

    projects.forEach(project => {
        const difficulty = project.dataset.difficulty;
        project.style.display = (selected.length === 0 || selected.includes(difficulty)) ? "" : "none";
        updateVisibleCount();
    });
}

function updateActiveButton(newButton) {
    const currentActive = filterList.querySelector('.active');
    if (currentActive) currentActive.classList.remove('active');
    newButton.classList.add('active');
}

function filterEvents(eventFilter) {
    projects.forEach((proj) => {
        const projCategory = proj.getAttribute('data-category');
        if (eventFilter === 'all' || eventFilter === projCategory) {
            proj.removeAttribute('hidden');
        } else {
            proj.setAttribute('hidden', '');
        }
        updateVisibleCount();
    });
}


function initializeProjectSystem() {

    // Requery so this also includes any cards Firestore just appended.
    projects = document.querySelectorAll('.project');

    // only runs on pages that have it
    if (projectList && projects.length) {
        updateVisibleCount();

        if (sortSelect) {
            sortSelect.addEventListener("change", () => {
                let projectz = Array.from(document.querySelectorAll(".project"));
                const difficultyOrder = { easy: 1, medium: 2, hard: 3 };

                if (sortSelect.value === "low-high") {
                    projectz.sort((a, b) => difficultyOrder[a.dataset.difficulty] - difficultyOrder[b.dataset.difficulty]);
                } else if (sortSelect.value === "high-low") {
                    projectz.sort((a, b) => difficultyOrder[b.dataset.difficulty] - difficultyOrder[a.dataset.difficulty]);
                } else if (sortSelect.value === "old-new") {
                    projectz.sort((a, b) => convertDate(a.dataset.date) - convertDate(b.dataset.date));
                } else if (sortSelect.value === "new-old") {
                    projectz.sort((a, b) => convertDate(b.dataset.date) - convertDate(a.dataset.date));
                }

                projectz.forEach(project => projectList.appendChild(project));
            });

            sortSelect.dispatchEvent(new Event("change"));
        }

        projects.forEach(project => {
            const date = project.dataset.date;
            const dateSpan = project.querySelector(".date");
            if (dateSpan) dateSpan.textContent = `● ${date}`;
        });

        if (checkboxes.length) {
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener("change", filterProjects);
            });
        }

        projects.forEach(project => {
            const level = project.dataset.difficulty;
            const skillText = project.querySelector('.skillText');
            const style = skillStyles[level];
            if (style && skillText) {
                skillText.style.backgroundColor = style.bg;
                skillText.style.color = style.text;
                skillText.textContent = level.charAt(0).toUpperCase() + level.slice(1);
            }
        });

        document.querySelectorAll('.project[code-language]').forEach(project => {
            const rawLanguages = project.getAttribute('code-language');
            const container = project.querySelector('.language-container');
            if (!container || !rawLanguages) return;

            container.innerHTML = '';
            const languages = rawLanguages.trim().toLowerCase().split(/\s+/);

            languages.forEach(lang => {
                const badge = document.createElement('span');
                badge.classList.add('categoryText');
                const style = languageStyles[lang] || { label: lang.toUpperCase(), bg: "#7C809B", text: "#FFFFFF" };
                badge.textContent = style.label;
                badge.style.backgroundColor = style.bg;
                badge.style.color = style.text;
                container.appendChild(badge);
            });
        });

        if (filterButtons) {
            filterButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const filter = e.currentTarget.getAttribute('data-filter');
                    updateActiveButton(e.currentTarget);
                    filterEvents(filter);
                });
            });
        }

        // Counts by category
        let totalNum = 0, gamesNum = 0, backendNum = 0, webNum = 0, othersNum = 0;
        projects.forEach(project => {
            totalNum += 1;
            switch (project.dataset.category) {
                case "backend": backendNum += 1; break;
                case "web": webNum += 1; break;
                case "games": gamesNum += 1; break;
                case "others": othersNum += 1; break;
            }
        });
        if (numText) {
            numText.textContent = `${totalNum} Projects | ${backendNum} Backend | ${webNum} Web | ${gamesNum} Games | ${othersNum} Others`;
        }
    }

    // Filter popup only runs on pages that have it
    if (openBtn && popup) {
        openBtn.addEventListener("click", function () {
            popup.style.display = (popup.style.display === "block") ? "none" : "block";
        });

        document.addEventListener("click", function (event) {
            if (!openBtn.contains(event.target) && !popup.contains(event.target)) {
                popup.style.display = "none";
            }
        });
    }

    // Project modal - only runs on pages that have it
    if (modalOverlay) {
        // Outer image box (.modal-img) is untouched. Its inner content is now
        // a Swiper instance instead of a single <img> - rebuilt on every open
        // from the clicked project's image list.
        const modalSwiperEl = modalOverlay.querySelector('.modal-img.swiper');
        const modalSwiperWrapper = modalSwiperEl ? modalSwiperEl.querySelector('.swiper-wrapper') : null;
        const modalText = modalOverlay.querySelector('.ModelText');
        const modalSkill = modalOverlay.querySelector('.ModelSkill');
        const modalLang = modalOverlay.querySelector('.ModalLanguage');
        const modalDesc = modalOverlay.querySelector('.ModalDescription');

        let modalSwiper = null;

        function renderModalSlides(images) {
            if (!modalSwiperEl || !modalSwiperWrapper) return;

            modalSwiperWrapper.innerHTML = images
                .map(src => `<div class="swiper-slide"><img src="${src}" alt=""></div>`)
                .join('');

            // Rebuild the instance each time rather than patching an existing
            // one - simplest way to keep loop/autoplay in sync with a slide
            // count that changes per project.
            if (modalSwiper) {
                modalSwiper.destroy(true, true);
                modalSwiper = null;
            }

            modalSwiper = new Swiper(modalSwiperEl, {
                loop: images.length > 1,
                autoplay: images.length > 1
                    ? { delay: 3000, disableOnInteraction: true }
                    : false,
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
            });
        }

        function closeModal() {
            modalOverlay.classList.remove("active");
            if (modalSwiper && modalSwiper.autoplay) {
                modalSwiper.autoplay.stop();
            }
        }

        projects.forEach(project => {
            project.addEventListener("click", () => {
                modalOverlay.classList.add("active");

                const sourceTitle = project.querySelector('.imgtxt');
                const sourceSkill = project.querySelector('.skillText');
                const sourceLang = project.querySelector('.language-container');
                const sourceImg = project.querySelector('img');
                const sourceDesc = project.querySelector('.moreDesc');

                // project.images comes from Firestore (set in loadProjects()).
                // Fall back to the card's single thumbnail if it's missing.
                const images = project.images && project.images.length
                    ? project.images
                    : (sourceImg ? [sourceImg.src] : []);

                if (images.length) renderModalSlides(images);

                if (modalText && sourceTitle) modalText.textContent = sourceTitle.textContent;
                if (modalSkill && sourceSkill) {
                    modalSkill.textContent = sourceSkill.textContent;
                    modalSkill.style.backgroundColor = sourceSkill.style.backgroundColor;
                    modalSkill.style.color = sourceSkill.style.color;
                }
                if (modalLang && sourceLang) modalLang.innerHTML = sourceLang.innerHTML;
                if (modalDesc && sourceDesc) modalDesc.textContent = sourceDesc.textContent;
            });
        });

        if (modalClose) {
            modalClose.addEventListener("click", closeModal);
        }

        modalOverlay.addEventListener("click", (event) => {
            if (event.target === modalOverlay) closeModal();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeModal();
        });
    }
}