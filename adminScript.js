import { db } from "./firebase.js";
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const addProjectPage = document.querySelector('.addProjectPage');

const title = addProjectPage.querySelector('.Title');
const desc = addProjectPage.querySelector('.Description');
const date = addProjectPage.querySelector('.Date');
const img = addProjectPage.querySelector('.Img');
const category = addProjectPage.querySelector('.Category');
const difficulty = addProjectPage.querySelector('.Difficulty');
const moreDescription = addProjectPage.querySelector('.MoreDescription');
const languages = addProjectPage.querySelector('.Languages');
const addProjectBtn = addProjectPage.querySelector('.addProjectBtn');

const adminProjectList = document.querySelector('.adminProjectList');

function isValidDateFormat(value) {
    const parts = value.split("/");
    if (parts.length !== 3) return false;

    const [day, month, year] = parts;
    const dayNum = Number(day);
    const monthNum = Number(month);
    const yearNum = Number(year);

    const dayOk = day.length <= 2 && dayNum >= 1 && dayNum <= 31;
    const monthOk = month.length <= 2 && monthNum >= 1 && monthNum <= 12;
    const yearOk = year.length === 4 && yearNum > 0;

    return dayOk && monthOk && yearOk;
}

async function loadAdminProjects() {
    if (!adminProjectList) return;

    adminProjectList.innerHTML = "<li>Loading...</li>";

    try {
        const querySnapshot = await getDocs(collection(db, "projects"));

        adminProjectList.innerHTML = "";

        if (querySnapshot.empty) {
            adminProjectList.innerHTML = "<li>No projects yet.</li>";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const project = docSnap.data();

            const item = document.createElement("li");
            item.classList.add("adminProjectItem");

            item.innerHTML = `
                <span class="adminProjectInfo">
                    ${project.imgTxt || "Untitled"}
                    (${project["data-category"] || "?"} / ${project["data-difficulty"] || "?"})
                </span>
                <button class="deleteBtn" data-id="${docSnap.id}">Delete</button>
            `;

            adminProjectList.appendChild(item);
        });

    } catch (error) {
        console.error("Error loading admin projects:", error);
        adminProjectList.innerHTML = "<li>Failed to load projects.</li>";
    }
}

// One listener on the list handles clicks on any delete button —
// including ones added after the page first loaded — via event delegation.
if (adminProjectList) {
    adminProjectList.addEventListener("click", async (event) => {
        const button = event.target.closest(".deleteBtn");
        if (!button) return;

        const id = button.dataset.id;
        if (!id) return;

        const confirmed = confirm("Delete this project? This can't be undone.");
        if (!confirmed) return;

        button.disabled = true;
        button.textContent = "Deleting...";

        try {
            await deleteDoc(doc(db, "projects", id));
            loadAdminProjects();
        } catch (error) {
            console.error("Error deleting project:", error);
            alert("Couldn't delete this project — check the console.");
            button.disabled = false;
            button.textContent = "Delete";
        }
    });
}

addProjectBtn.addEventListener("click", async function () {

    const fields = [title, desc, date, img, category, difficulty, moreDescription, languages];

    if (fields.some(field => field.value.trim() === "")) {
        alert("Please fill in all fields.");
        return;
    }

    if (!isValidDateFormat(date.value.trim())) {
        alert("Please enter the date as dd/mm/yyyy.");
        return;
    }

    const newProject = {
        imgTxt: title.value.trim(),
        imgDesc: desc.value.trim(),
        imgMoreDesc: moreDescription.value.trim(),
        imgSrc: img.value.trim(),
        "data-category": category.value,
        "data-difficulty": difficulty.value,
        "data-date": date.value.trim(),
        "code-language": languages.value.trim().toLowerCase()
    };

    addProjectBtn.disabled = true;
    addProjectBtn.textContent = "Adding...";

    try {
        await addDoc(collection(db, "projects"), newProject);
        alert("Project added!");
        fields.forEach(field => field.value = "");
        loadAdminProjects();
    } catch (error) {
        console.error("Error adding project:", error);
        alert("Something went wrong — check the console.");
    } finally {
        addProjectBtn.disabled = false;
        addProjectBtn.textContent = "Add Project";
    }
});

loadAdminProjects();