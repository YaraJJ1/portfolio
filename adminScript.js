import { db } from "./firebase.js"; 

import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    getDoc
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
        GITHUB_TOKEN = null; // clear any cached token on logout
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
const addProjectBtn = document.getElementById('submit-project-btn');


const adminProjectList = document.querySelector('.adminProjectList');

const inputFile = document.getElementById('input-file');
const imageUploaderEl = document.getElementById('image-uploader');
const imageListEl = document.getElementById('image-list');
const uploadHintEl = document.getElementById('upload-hint');


const GITHUB_OWNER = "yarajj1";
const GITHUB_REPO = "portfolio"; 
const GITHUB_BRANCH = "main";
const GITHUB_IMAGE_FOLDER = "images";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

let GITHUB_TOKEN = null;

async function loadGithubToken() {
    if (GITHUB_TOKEN) return GITHUB_TOKEN;

    let snap;
    try {
        snap = await getDoc(doc(db, "config", "githubToken"));
    } catch (error) {
        throw new Error(
            "Couldn't read the GitHub token from Firestore " +
            `(${error.code || error.message}). Check that you're logged in and that ` +
            "the config/githubToken security rule allows your admin UID to read it."
        );
    }

    if (!snap.exists()) {
        throw new Error("Firestore doc config/githubToken doesn't exist yet — add it in the Firebase console.");
    }

    GITHUB_TOKEN = snap.data().token;

    if (!GITHUB_TOKEN) {
        throw new Error("Firestore doc config/githubToken exists but has no 'token' field.");
    }

    return GITHUB_TOKEN;
}



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

// Build a collision-safe filename like "1735689000000-my-project.png" — or
// "1735689000000-2-my-project.png" for the 3rd+ image of one project, so
// several images uploaded moments apart never overwrite each other.
function buildImageFilename(file, projectTitle, index = 0) {
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const safeTitle = projectTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 40);
    const suffix = index > 0 ? `-${index}` : "";
    return `${Date.now()}${suffix}-${safeTitle || "project"}.${ext}`;
}

// Commit one image to the GitHub repo and return its jsDelivr CDN URL.
// `index` is only used to keep filenames unique when uploading several
// images for the same project.
async function uploadImageToGithub(file, projectTitle, index = 0) {
    if (file.size > MAX_IMAGE_BYTES) {
        throw new Error(`Image ${index + 1} is over 5MB — resize it before uploading.`);
    }

    const token = await loadGithubToken();

    const filename = buildImageFilename(file, projectTitle, index);
    const path = `${GITHUB_IMAGE_FOLDER}/${filename}`;
    const base64Content = await fileToBase64(file);

    const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
        {
            method: "PUT",
            headers: {
                Authorization: `token ${token}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: `Add project image: ${filename}`,
                content: base64Content,
                branch: GITHUB_BRANCH
            })
        }
    );

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));

        if (response.status === 404) {
            throw new Error(
                "GitHub upload failed (404) — the token doesn't have access to this repo. " +
                "Check that the token's Repository access includes yarajj1.github.io and " +
                "that its Contents permission is set to Read and write."
            );
        }
        if (response.status === 401) {
            throw new Error("GitHub upload failed (401) — the token looks invalid or expired.");
        }

        throw new Error(errorBody.message || `GitHub upload failed (${response.status})`);
    }

   
    return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${path}`;
}

// ---------- Existing projects list ----------
// Just names + a delete button — no thumbnails here, this is an admin
// index, not a gallery.
async function loadAdminProjects() {
    if (!adminProjectList) return;

    adminProjectList.innerHTML = "<li>Loading…</li>";

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
                <span class="adminProjectName">${project.imgTxt || "Untitled"}</span>
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

// ---------- Multi-image picker ----------
// Images are staged here (as {file, url} pairs, in display order) until the
// project is submitted. The first entry is always the thumbnail. Nothing is
// uploaded to GitHub until "Add Project" is clicked.
//
// The "add" tile lives permanently as the last <li> in #image-list (it's in
// the HTML, not generated) so there's always an obvious, always-visible way
// to add more images — click it or drag files anywhere onto the uploader —
// no matter how many are already staged.
let stagedImages = [];

function renderImageList() {
    if (imageListEl) {
        const addTile = imageListEl.querySelector('.image-tile--add');

        imageListEl.querySelectorAll('.image-tile:not(.image-tile--add)').forEach(el => el.remove());

        const tilesHtml = stagedImages.map((item, index) => `
            <li class="image-tile">
                <img src="${item.url}" class="image-thumb" alt="">
                ${index === 0 ? '<span class="image-badge">Thumbnail</span>' : ""}
                <div class="image-controls">
                    <button type="button" class="moveLeftBtn" data-index="${index}" ${index === 0 ? "disabled" : ""} aria-label="Move earlier">‹</button>
                    <button type="button" class="removeImageBtn" data-index="${index}" aria-label="Remove image">×</button>
                    <button type="button" class="moveRightBtn" data-index="${index}" ${index === stagedImages.length - 1 ? "disabled" : ""} aria-label="Move later">›</button>
                </div>
            </li>
        `).join("");

        if (addTile) {
            addTile.insertAdjacentHTML("beforebegin", tilesHtml);
        } else {
            imageListEl.insertAdjacentHTML("afterbegin", tilesHtml);
        }
    }

    if (uploadHintEl) {
        const count = stagedImages.length;
        uploadHintEl.textContent = count
            ? `${count} image${count > 1 ? "s" : ""} added — click or drop to add more`
            : "First image becomes the thumbnail";
    }
}

function addStagedFiles(fileList) {
    const files = Array.from(fileList || []).filter(file => file.type.startsWith("image/"));
    files.forEach(file => {
        stagedImages.push({ file, url: URL.createObjectURL(file) });
    });
    renderImageList();
}

function removeStagedImage(index) {
    const [removed] = stagedImages.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed.url);
    renderImageList();
}

function moveStagedImage(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= stagedImages.length) return;
    [stagedImages[index], stagedImages[newIndex]] = [stagedImages[newIndex], stagedImages[index]];
    renderImageList();
}

if (imageListEl) {
    imageListEl.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button) return;

        const index = Number(button.dataset.index);
        if (button.classList.contains("removeImageBtn")) removeStagedImage(index);
        else if (button.classList.contains("moveLeftBtn")) moveStagedImage(index, -1);
        else if (button.classList.contains("moveRightBtn")) moveStagedImage(index, 1);
    });
}

function resetImagePicker() {
    inputFile.value = "";
    stagedImages.forEach(item => URL.revokeObjectURL(item.url));
    stagedImages = [];
    renderImageList();
    if (imageUploaderEl) {
        imageUploaderEl.classList.remove("uploading");
        imageUploaderEl.classList.remove("dragging");
    }
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

        if (!stagedImages.length) {
            alert("Please add at least one image above.");
            return;
        }

        addProjectBtn.disabled = true;

        try {
            if (imageUploaderEl) imageUploaderEl.classList.add("uploading");

            const imageUrls = [];
            for (let i = 0; i < stagedImages.length; i++) {
                addProjectBtn.textContent = `Uploading image ${i + 1} of ${stagedImages.length}...`;
                const url = await uploadImageToGithub(stagedImages[i].file, title.value.trim(), i);
                imageUrls.push(url);
            }
            console.log("Upload successful, URLs:", imageUrls);

            addProjectBtn.textContent = "Adding to database...";

            const newProject = {
                imgTxt: title.value.trim(),
                imgDesc: desc.value.trim(),
                imgMoreDesc: moreDescription.value.trim(),
                imgSrc: imageUrls[0], // kept so anything still reading the old single-image field still works
                images: imageUrls,
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
            if (imageUploaderEl) imageUploaderEl.classList.remove("uploading");
            addProjectBtn.disabled = false;
            addProjectBtn.textContent = "Add Project";
        }
    });
}

loadAdminProjects();
});

inputFile.addEventListener("change", () => {
    addStagedFiles(inputFile.files);
    inputFile.value = ""; // clear so picking the same file again still fires "change"
});

// Drag-and-drop targets the whole uploader (not just the small add tile) so
// dropping files anywhere over the staged images works too.
if (imageUploaderEl) {
    imageUploaderEl.addEventListener("dragover", function (e) {
        e.preventDefault();
        imageUploaderEl.classList.add("dragging");
    });

    imageUploaderEl.addEventListener("dragleave", function (e) {
        if (!imageUploaderEl.contains(e.relatedTarget)) {
            imageUploaderEl.classList.remove("dragging");
        }
    });

    imageUploaderEl.addEventListener("drop", function (e) {
        e.preventDefault();
        imageUploaderEl.classList.remove("dragging");
        addStagedFiles(e.dataTransfer.files);
    });
}