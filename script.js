const filterList = document.querySelector('.filter');
const filterButtons = filterList.querySelectorAll('.filter-btn');
const projects = document.querySelectorAll('.project');
const projectList = document.querySelector('.project-list');
const sortSelect = document.getElementById("difficultySort");
const originalProjects = Array.from(document.querySelectorAll(".project"));
const totalNumText = document.querySelector('.totalNum');

const languageStyles = {
    "html":       { label: "HTML",       bg: "#dd7156", text: "#FFFFFF" },
    "css":        { label: "CSS",        bg: "#5f7be9", text: "#FFFFFF" },
    "js":         { label: "JS",         bg: "#55863f", text: "#ffffff" },
    "java":       { label: "Java",       bg: "#866aa5", text: "#FFFFFF" },
    "c++":        { label: "C++",        bg: "#AE759F", text: "#FFFFFF" },
    "c#":         { label: "C#",         bg: "#439775", text: "#FFFFFF" },
    "python":     { label: "Python",     bg: "#3776AB", text: "#FFFFFF" },
    "unity":     { label: "Unity",     bg: "#37ab62", text: "#FFFFFF" },
    "php":     { label: "PHP",     bg: "#486552", text: "#FFFFFF" },
    "sql":       { label: "SQL",       bg: "#c99082", text: "#FFFFFF" }
};
const skillStyles = {
    "easy":    { bg: "#9B7EDE", text: "#FFFFFF" },
    "medium": { bg: "#7563af", text: "#ffffff" }, 
    "hard":   { bg: "#c37097", text: "#ffffff" }  
};

function convertDate(date) {

    const [day, month, year] = date.split("/");

    return new Date(year, month - 1, day);
}
function updateVisibleCount() {
    const visibleCount = Array.from(projects).filter(project => {
        return !project.hidden && project.style.display !== 'none';
    }).length;

    totalNumText.textContent = `${visibleCount} Projects`;
}
updateVisibleCount();
function filterProjects() {
    const selected = Array.from(checkboxes).filter(checkbox => checkbox.checked).map(checkbox => checkbox.value);
    projects.forEach(project => {
        const difficulty = project.dataset.difficulty;

        if (selected.length === 0 || selected.includes(difficulty)) {
            project.style.display = "";
        }
        else {
            project.style.display = "none";
        }
        
        updateVisibleCount();

    });
}

function updateActiveButton(newButton) {
    filterList.querySelector('.active').classList.remove('active');
    newButton.classList.add('active');
}

function filterEvents(eventFilter) {
    // get each project category
    console.log('filterevents called: ', JSON.stringify(eventFilter));
    projects.forEach((proj) => {
        const projCategory = proj.getAttribute('data-category');
   
    // check if category matches the filter
    // if matches then show conf if not hide the project
    if (eventFilter === 'all' || eventFilter === projCategory) {
        proj.removeAttribute('hidden');

    } 
    else {
        proj.setAttribute('hidden', '');
    }
    updateVisibleCount();

 });
}

sortSelect.addEventListener("change", () => {
    let projectz = Array.from(document.querySelectorAll(".project"));
    const difficultyOrder = {easy: 1, medium: 2, hard: 3};

    if (sortSelect.value === "low-high") {
        projectz.sort((a, b) => {
            return difficultyOrder[a.dataset.difficulty] - difficultyOrder[b.dataset.difficulty];
        });
    } 
    else if (sortSelect.value === "high-low") {
        projectz.sort((a, b) => {
            return difficultyOrder[b.dataset.difficulty] - difficultyOrder[a.dataset.difficulty];
        });
    } 
    else if (sortSelect.value === "old-new") {
        projectz.sort((a, b) => {
            return convertDate(a.dataset.date) - convertDate(b.dataset.date);
        });
    } 
    else if (sortSelect.value === "new-old") {
        projectz.sort((a, b) => {
            return convertDate(b.dataset.date) - convertDate(a.dataset.date);
        });
    }

    projectz.forEach(project => {
        projectList.appendChild(project);
    });
});

sortSelect.dispatchEvent(new Event("change"));

projects.forEach(project => {
    const date = project.dataset.date;
    const dateSpan = project.querySelector(".date");

    dateSpan.textContent = `● ${date}`;

});

/* filtering and sorting system */
const checkboxes = document.querySelectorAll(".difficulty-checkbox");
checkboxes.forEach(checkbox => {
    checkbox.addEventListener("change", filterProjects);
});

const filterSkills = document.querySelectorAll('.project');

filterSkills.forEach(project => {
    const level = project.dataset.difficulty;
    const skillText = project.querySelector('.skillText');
    const style = skillStyles[level];

    if (style) {
        skillText.style.backgroundColor = style.bg;
        skillText.style.color = style.text;
        skillText.textContent = level.charAt(0).toUpperCase() + level.slice(1);
    }
});
// tbh used ai to simplify this part
const projectss = document.querySelectorAll('.project[code-language]');

projectss.forEach(project => {
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

filterButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const filter = e.currentTarget.getAttribute('data-filter');
        updateActiveButton(e.currentTarget);
        filterEvents(filter);
    })
});

/* filtering Skill level */
const openBtn = document.getElementById("openBtn");
const popup = document.getElementById("popup");

openBtn.addEventListener("click", function () {
    if (popup.style.display === "block") {
        popup.style.display = "none";
    } else {
        popup.style.display = "block";
    }
});

document.addEventListener("click", function (event) {
    if (!openBtn.contains(event.target) && !popup.contains(event.target)) {
        popup.style.display = "none";
    }
});

const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
// this is for the modal overlay
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

        modalImg.src = sourceImg.src;
        modalImg.alt = sourceImg.alt;
        
        modalText.textContent = sourceTitle.textContent;
        
        
        modalSkill.textContent = sourceSkill.textContent;
        modalSkill.style.backgroundColor = sourceSkill.style.backgroundColor;
        modalSkill.style.color = sourceSkill.style.color;
        modalLang.innerHTML = sourceLang.innerHTML;
        modalDesc.textContent = sourceDesc.textContent;
    });
});

modalClose.addEventListener("click", () => {
    modalOverlay.classList.remove("active");
});

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



// number of projects
let totalNum = 0;
let gamesNum = 0;
let backendNum = 0;
let webNum = 0;
let othersNum = 0;

const numText = document.querySelector(".numOfProjects");

projects.forEach(project => {
    
    const projectType = project.dataset.category;

    totalNum += 1;
    numText.textContent+=totalNum;

    switch(projectType) {
    case "backend":
        backendNum += 1;
    break;
    case "web":
        webNum += 1;
    break;
    case "games":
        gamesNum += 1;
    break;
    case "others":
        othersNum += 1;
    break;
    }

});
numText.textContent = `${totalNum} Projects | ${backendNum} Backend | ${webNum} Web | ${gamesNum} Games | ${othersNum} Others`;


