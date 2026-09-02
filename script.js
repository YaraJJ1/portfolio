// ---------- Element references ----------
const filterList = document.querySelector('.filter');
const filterButtons = filterList ? filterList.querySelectorAll('.filter-btn') : null;
const projects = document.querySelectorAll('.project');
const projectList = document.querySelector('.project-list');
const sortSelect = document.getElementById("difficultySort");
const totalNumText = document.querySelector('.totalNum');
const numText = document.querySelector(".numOfProjects");
const openBtn = document.getElementById("openBtn");
const popup = document.getElementById("popup");
const checkboxes = document.querySelectorAll(".difficulty-checkbox");
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = modalOverlay ? document.getElementById("modalClose") : null;

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

// ---------- Project list logic (only runs on pages that have it) ----------
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

// ---------- Filter popup (only runs on pages that have it) ----------
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

// ---------- Project modal (only runs on pages that have it) ----------
if (modalOverlay) {
    const modalImg = modalOverlay.querySelector('.modal-img');
    const modalText = modalOverlay.querySelector('.ModelText');
    const modalSkill = modalOverlay.querySelector('.ModelSkill');
    const modalLang = modalOverlay.querySelector('.ModalLanguage');
    const modalDesc = modalOverlay.querySelector('.ModalDescription');

    projects.forEach(project => {
        project.addEventListener("click", () => {
            modalOverlay.classList.add("active");

            const sourceTitle = project.querySelector('.imgtxt');
            const sourceSkill = project.querySelector('.skillText');
            const sourceLang = project.querySelector('.language-container');
            const sourceImg = project.querySelector('img');
            const sourceDesc = project.querySelector('.moreDesc');

            if (modalImg && sourceImg) {
                modalImg.src = sourceImg.src;
                modalImg.alt = sourceImg.alt;
            }
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
        modalClose.addEventListener("click", () => {
            modalOverlay.classList.remove("active");
        });
    }

    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            modalOverlay.classList.remove("active");
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            modalOverlay.classList.remove("active");
        }
    });
}