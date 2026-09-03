import { db } from "./firebase.js"; 

import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    getAuth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const auth = getAuth();

const loginContainer = document.getElementById("login-container");
const adminContent = document.getElementById("admin-content");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");

onAuthStateChanged(auth, (user) => {
    if (user) {
        if (loginContainer) loginContainer.style.display = "none";
        if (adminContent) {
            adminContent.style.display = "block";
            adminContent.removeAttribute("hidden"); 
        }
    } else {
        if (loginContainer) loginContainer.style.display = "block";
        if (adminContent) adminContent.style.display = "none";
    }
});

if (loginBtn) {
    loginBtn.addEventListener("click", () => {
        const email = document.getElementById("admin-email").value;
        const password = document.getElementById("admin-password").value;

        if(!email || !password) {
            alert("Please enter both email and password.");
            return;
        }

        signInWithEmailAndPassword(auth, email, password)
            .catch((error) => {
                alert("Login Error: " + error.message);
            });
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        signOut(auth).catch((error) => {
            console.error("Logout Error: ", error);
        });
    });
}


//
const addProjectPage = document.querySelector('#admin-content .addProjectPage');

const title = addProjectPage.querySelector('.Title');
const desc = addProjectPage.querySelector('.Description');
const date = addProjectPage.querySelector('.Date');
const category = addProjectPage.querySelector('.Category');
const difficulty = addProjectPage.querySelector('.Difficulty');
const moreDescription = addProjectPage.querySelector('.MoreDescription');
const languages = addProjectPage.querySelector('.Languages');
// const addProjectBtn = addProjectPage.querySelector('.addProjectBtn');
const addProjectBtn = document.getElementById('submit-project-btn');


const adminProjectList = document.querySelector('.adminProjectList');

const dropArea = document.getElementById('drop-area');
const inputFile = document.getElementById('input-file');
const imageView = document.getElementById('img-view');


const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            resolve(result.substring(result.indexOf(",") + 1));
        };
        reader.onerror = () => reject(new Error("Couldn't read the image file."));
        reader.readAsDataURL(file);
    });
}

// Build a collision-safe filename like "1735689000000-my-project.png"
function buildImageFilename(file, projectTitle) {
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const safeTitle = projectTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 40);
    return `${Date.now()}-${safeTitle || "project"}.${ext}`;
}

// Ask the github-upload serverless function to commit the image to the GitHub repo
// (it holds the GitHub token server-side) and return its jsDelivr CDN URL.
async function uploadImageToGithub(file, projectTitle) {
    if (file.size > MAX_IMAGE_BYTES) {
        throw new Error("That image is over 5MB — resize it before uploading.");
    }

    const filename = buildImageFilename(file, projectTitle);
    const base64Content = await fileToBase64(file);
    const idToken = await auth.currentUser.getIdToken();

    const response = await fetch("/.netlify/functions/github-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, filename, base64Content })
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(body.error || `Upload failed (${response.status})`);
    }

    return body.url;
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
       
        adminProjectList.innerHTML = `<li>Failed to load projects (${error.code || error.message}). If that says "permission-denied", check your Firestore rules.</li>`;
    }
}

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
    inputFile.value = "";
    imageView.style.backgroundImage = "";
    imageView.classList.remove("has-image");
    imageView.classList.remove("uploading");
}
document.addEventListener("DOMContentLoaded", () => {
if (!addProjectBtn) {
    console.error("ERROR: addProjectBtn not found! Check if your HTML has id='addProjectBtn'");
} else {
    addProjectBtn.addEventListener("click", async function (e) {
        
        e.preventDefault(); 

        const requiredFields = [title, desc, date, category, difficulty, moreDescription, languages];

        requiredFields.forEach((field, index) => {
            console.log(`Checking field ${index}:`, field ? "Found" : "Missing Element");
        });

        if (requiredFields.some(field => !field || !field.value || field.value.trim() === "")) {
            alert("Please fill in all fields.");
            return;
        }

        if (!isValidDateFormat(date.value.trim())) {
            alert("Please enter the date as dd/mm/yyyy.");
            return;
        }

        const droppedFile = inputFile ? inputFile.files[0] : null;

        if (!droppedFile) {
            alert("Please drop an image above, or click it to browse for one.");
            return;
        }

        addProjectBtn.disabled = true;

        try {
            console.log("Starting GitHub upload...");
            addProjectBtn.textContent = "Uploading image...";
            if (imageView) imageView.classList.add("uploading");

            const imageUrl = await uploadImageToGithub(droppedFile, title.value.trim());
            console.log("Upload successful, URL:", imageUrl);

            addProjectBtn.textContent = "Adding to database...";

            const newProject = {
                imgTxt: title.value.trim(),
                imgDesc: desc.value.trim(),
                imgMoreDesc: moreDescription.value.trim(),
                imgSrc: imageUrl,
                "data-category": category.value,
                "data-difficulty": difficulty.value,
                "data-date": date.value.trim(),
                "code-language": languages.value.trim().toLowerCase()
            };

            await addDoc(collection(db, "projects"), newProject);
            
            console.log("Successfully saved to Firestore!");
            alert("Project added!");
            
            // Safely clear all fields
            requiredFields.forEach(field => {
                if (field) field.value = "";
            });
            
            resetImagePicker();
            loadAdminProjects();
            
        } catch (error) {
            console.error("Error adding project:", error);
            alert(`Something went wrong: ${error.message}`);
        } finally {
            if (imageView) imageView.classList.remove("uploading");
            addProjectBtn.disabled = false;
            addProjectBtn.textContent = "Add Project";
        }
    });
}

loadAdminProjects();
});
inputFile.addEventListener("change", handleImageSelected);

function handleImageSelected() {
    const file = inputFile.files[0];
    if (!file) return;

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