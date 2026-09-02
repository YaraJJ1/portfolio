import { db, storage } from "./firebase.js";
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

const addProjectPage = document.querySelector('.addProjectPage');

const title = addProjectPage.querySelector('.Title');
const desc = addProjectPage.querySelector('.Description');
const date = addProjectPage.querySelector('.Date');
const category = addProjectPage.querySelector('.Category');
const difficulty = addProjectPage.querySelector('.Difficulty');
const moreDescription = addProjectPage.querySelector('.MoreDescription');
const languages = addProjectPage.querySelector('.Languages');
const addProjectBtn = addProjectPage.querySelector('.addProjectBtn');

const adminProjectList = document.querySelector('.adminProjectList');

// image upload elements (the drag & drop / click-to-browse widget)
const dropArea = document.getElementById('drop-area');
const inputFile = document.getElementById('input-file');
const imageView = document.getElementById('img-view');

let selectedImageFile = null;

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

function resetImagePicker() {
    selectedImageFile = null;
    inputFile.value = "";
    imageView.style.backgroundImage = "";
    imageView.classList.remove("has-image");
}

addProjectBtn.addEventListener("click", async function () {

    const fields = [title, desc, date, category, difficulty, moreDescription, languages];

    if (fields.some(field => field.value.trim() === "")) {
        alert("Please fill in all fields.");
        return;
    }

    if (!isValidDateFormat(date.value.trim())) {
        alert("Please enter the date as dd/mm/yyyy.");
        return;
    }

    if (!selectedImageFile) {
        alert("Please choose an image for the project.");
        return;
    }

    addProjectBtn.disabled = true;
    addProjectBtn.textContent = "Uploading image...";

    try {
        // 1. upload the file to Firebase Storage and get a permanent URL
        const imagePath = `projects/${Date.now()}-${selectedImageFile.name}`;
        const imageRef = ref(storage, imagePath);
        await uploadBytes(imageRef, selectedImageFile);
        const imgSrc = await getDownloadURL(imageRef);

        addProjectBtn.textContent = "Adding...";

        // 2. save the project doc with the Storage URL instead of a raw file
        const newProject = {
            imgTxt: title.value.trim(),
            imgDesc: desc.value.trim(),
            imgMoreDesc: moreDescription.value.trim(),
            imgSrc,
            "data-category": category.value,
            "data-difficulty": difficulty.value,
            "data-date": date.value.trim(),
            "code-language": languages.value.trim().toLowerCase()
        };

        await addDoc(collection(db, "projects"), newProject);
        alert("Project added!");
        fields.forEach(field => field.value = "");
        resetImagePicker();
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

// image drag & drop / click-to-browse picker
inputFile.addEventListener("change", handleImageSelected);

function handleImageSelected() {
    const file = inputFile.files[0];
    if (!file) return;

    selectedImageFile = file;

    const imgLink = URL.createObjectURL(file);
    imageView.style.backgroundImage = `url(${imgLink})`;
    imageView.classList.add("has-image");
}

dropArea.addEventListener("dragover", function (e) {
    e.preventDefault();
    imageView.classList.add("dragging");
});

dropArea.addEventListener("dragleave", function () {
    imageView.classList.remove("dragging");
});

dropArea.addEventListener("drop", function (e) {
    e.preventDefault();
    imageView.classList.remove("dragging");
    inputFile.files = e.dataTransfer.files;
    handleImageSelected();
});