import { db } from "./firebase.js"; 

import {
    collection,
    addDoc,
    updateDoc,
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
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const addHeader = addProjectPage.querySelector('.addHeader');

// Fields required for both adding a new project and saving edits to one.
const requiredFields = [title, desc, date, category, difficulty, moreDescription, languages];


const adminProjectList = document.querySelector('.adminProjectList');

const inputFile = document.getElementById('input-file');
const imageUploaderEl = document.getElementById('image-uploader');
const imageListEl = document.getElementById('image-list');
const uploadHintEl = document.getElementById('upload-hint');


const GITHUB_OWNER = "yarajj1";
const GITHUB_REPO = "portfolio"; 
const GITHUB_BRANCH = "main";
const GITHUB_IMAGE_FOLDER = "images";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;   // 5MB per image
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;  // 20MB per video clip - keep clips short

let GITHUB_TOKEN = null;

// Set while the form is editing an existing project instead of creating a
// new one. Holds that project's Firestore doc id, or null in "Add" mode.
let editingProjectId = null;

// Cache of the raw Firestore data for every project currently listed in the
// admin sidebar, keyed by doc id — lets "Edit" populate the form instantly
// without a second Firestore read.
let adminProjectsById = new Map();

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
// "1735689000000-2-my-project.png" for the 3rd+ item of one project, so
// several images/videos uploaded moments apart never overwrite each other.
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

// Commit one image or video to the GitHub repo and return its jsDelivr CDN
// URL. `index` is only used to keep filenames unique when uploading several
// items for the same project. `type` ("image" | "video") picks the right
// size limit and error wording.
async function uploadMediaToGithub(file, projectTitle, index = 0, type = "image") {
    const limit = type === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > limit) {
        const limitLabel = type === "video" ? "20MB" : "5MB";
        const verb = type === "video" ? "trim/compress it" : "resize it";
        throw new Error(`${type === "video" ? "Video" : "Image"} ${index + 1} is over ${limitLabel} — ${verb} before uploading.`);
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
                message: `Add project media: ${filename}`,
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
// Names + Edit/Delete buttons — no thumbnails here, this is an admin
// index, not a gallery.
async function loadAdminProjects() {
    if (!adminProjectList) return;

    adminProjectList.innerHTML = "<li>Loading…</li>";
    adminProjectsById = new Map();

    try {
        const querySnapshot = await getDocs(collection(db, "projects"));

        adminProjectList.innerHTML = "";

        if (querySnapshot.empty) {
            adminProjectList.innerHTML = "<li>No projects yet.</li>";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const project = docSnap.data();
            adminProjectsById.set(docSnap.id, project);

            const item = document.createElement("li");
            item.classList.add("adminProjectItem");

            item.innerHTML = `
                <span class="adminProjectName">${project.imgTxt || "Untitled"}</span>
                <span class="adminProjectActions">
                    <button class="editBtn" data-id="${docSnap.id}">Edit</button>
                    <button class="deleteBtn" data-id="${docSnap.id}">Delete</button>
                </span>
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
        const editButton = event.target.closest(".editBtn");
        if (editButton) {
            const id = editButton.dataset.id;
            if (id) startEditingProject(id);
            return;
        }

        const deleteButton = event.target.closest(".deleteBtn");
        if (!deleteButton) return;

        const id = deleteButton.dataset.id;
        if (!id) return;

        const confirmed = confirm("Delete this project? This can't be undone.");
        if (!confirmed) return;

        deleteButton.disabled = true;
        deleteButton.textContent = "Deleting...";

        try {
            await deleteDoc(doc(db, "projects", id));
            // If the project being deleted is the one currently loaded into
            // the form, back out of edit mode so a leftover "Update Project"
            // click can't try to update a doc that no longer exists.
            if (editingProjectId === id) stopEditingProject();
            loadAdminProjects();
        } catch (error) {
            console.error("Error deleting project:", error);
            alert("Couldn't delete this project — check the console.");
            deleteButton.disabled = false;
            deleteButton.textContent = "Delete";
        }
    });
}

// Loads an existing project's data into the Add-Project form so it can be
// edited in place, and flips the form into "edit mode" (editingProjectId
// set, submit button relabeled, Cancel Edit button shown).
function startEditingProject(id) {
    const project = adminProjectsById.get(id);
    if (!project) {
        alert("Couldn't find that project's data — try refreshing the page.");
        return;
    }

    editingProjectId = id;

    title.value = project.imgTxt || "";
    desc.value = project.imgDesc || "";
    date.value = project["data-date"] || "";
    if (project["data-category"]) category.value = project["data-category"];
    if (project["data-difficulty"]) difficulty.value = project["data-difficulty"];
    moreDescription.value = project.imgMoreDesc || "";
    languages.value = project["code-language"] || "";

    resetImagePicker(); // clear any leftover staged files first

    // Pre-load the project's existing media into the picker as
    // already-hosted items (url + type, no File) - submit skips
    // re-uploading these unless they're removed and a replacement is added.
    const existingMedia = Array.isArray(project.media) && project.media.length
        ? project.media
        : (Array.isArray(project.images) && project.images.length
            ? project.images.map(url => ({ url, type: "image" }))
            : (project.imgSrc ? [{ url: project.imgSrc, type: "image" }] : []));

    stagedImages = existingMedia.map(item => ({ url: item.url, type: item.type || "image" }));
    renderImageList();

    addProjectBtn.textContent = "Update Project";
    if (cancelEditBtn) cancelEditBtn.hidden = false;
    if (addHeader) addHeader.textContent = `Editing "${project.imgTxt || "Untitled"}"`;

    addProjectPage.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Clears the form and drops out of edit mode, back to "Add a new project".
function stopEditingProject() {
    editingProjectId = null;

    requiredFields.forEach(field => {
        if (field) field.value = "";
    });
    resetImagePicker();

    addProjectBtn.textContent = "Add Project";
    if (cancelEditBtn) cancelEditBtn.hidden = true;
    if (addHeader) addHeader.textContent = "Enter Project details: ";
}

// ---------- Multi-media picker ----------
// Images and videos are staged here (as {file, url, type} entries, in
// display order) until the project is submitted. The first entry is always
// the thumbnail (if it's a video, the public card falls back to a
// placeholder image instead of trying to thumbnail it - see script.js).
// Nothing is uploaded to GitHub until "Add Project" is clicked.
//
// While editing an existing project, staged entries carried over from that
// project have a url + type but no file - they're already hosted, so
// submit only re-uploads items that do have a file (newly picked ones).
//
// The "add" tile lives permanently as the last <li> in #image-list (it's in
// the HTML, not generated) so there's always an obvious, always-visible way
// to add more items — click it or drag files anywhere onto the uploader —
// no matter how many are already staged.
let stagedImages = [];

function renderImageList() {
    if (imageListEl) {
        const addTile = imageListEl.querySelector('.image-tile--add');

        imageListEl.querySelectorAll('.image-tile:not(.image-tile--add)').forEach(el => el.remove());

        const tilesHtml = stagedImages.map((item, index) => {
            const mediaHtml = item.type === "video"
                ? `<video src="${item.url}" class="image-thumb" style="width:100%;height:100%;object-fit:cover;display:block;" muted playsinline preload="metadata"></video>`
                : `<img src="${item.url}" class="image-thumb" style="width:100%;height:100%;object-fit:cover;display:block;" alt="">`;

            return `
                <li class="image-tile" style="width:56px;height:56px;">
                    ${mediaHtml}
                    ${index === 0 ? '<span class="image-badge">Thumbnail</span>' : ""}
                    ${item.type === "video" ? '<span class="image-badge image-badge--video">▶</span>' : ""}
                    <div class="image-controls">
                        <button type="button" class="moveLeftBtn" data-index="${index}" ${index === 0 ? "disabled" : ""} aria-label="Move earlier">‹</button>
                        <button type="button" class="removeImageBtn" data-index="${index}" aria-label="Remove image">×</button>
                        <button type="button" class="moveRightBtn" data-index="${index}" ${index === stagedImages.length - 1 ? "disabled" : ""} aria-label="Move later">›</button>
                    </div>
                </li>
            `;
        }).join("");

        if (addTile) {
            addTile.insertAdjacentHTML("beforebegin", tilesHtml);
        } else {
            imageListEl.insertAdjacentHTML("afterbegin", tilesHtml);
        }
    }

    if (uploadHintEl) {
        const count = stagedImages.length;
        uploadHintEl.textContent = count
            ? `${count} item${count > 1 ? "s" : ""} added — click or drop to add more`
            : "First item becomes the thumbnail — images or a short video clip";
    }
}

function addStagedFiles(fileList) {
    const files = Array.from(fileList || []).filter(file =>
        file.type.startsWith("image/") || file.type.startsWith("video/")
    );
    files.forEach(file => {
        stagedImages.push({
            file,
            url: URL.createObjectURL(file),
            type: file.type.startsWith("video/") ? "video" : "image"
        });
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
    // Only real blob URLs (newly picked files) need revoking - calling this
    // on an already-hosted https:// URL (from an in-progress edit) is a
    // harmless no-op, so this is safe for both kinds of staged item.
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
            alert("Please add at least one image or video above.");
            return;
        }

        addProjectBtn.disabled = true;

        try {
            if (imageUploaderEl) imageUploaderEl.classList.add("uploading");

            const media = [];
            for (let i = 0; i < stagedImages.length; i++) {
                const staged = stagedImages[i];

                if (staged.file) {
                    // A newly picked file - upload it to GitHub.
                    const label = staged.type === "video" ? "video" : "image";
                    addProjectBtn.textContent = `Uploading ${label} ${i + 1} of ${stagedImages.length}...`;
                    const url = await uploadMediaToGithub(staged.file, title.value.trim(), i, staged.type);
                    media.push({ url, type: staged.type });
                } else {
                    // Carried over from the project being edited - already
                    // hosted on GitHub/jsDelivr, nothing to upload.
                    media.push({ url: staged.url, type: staged.type });
                }
            }
            console.log("Media ready:", media);

            addProjectBtn.textContent = editingProjectId ? "Saving changes..." : "Adding to database...";

            const projectFields = {
                imgTxt: title.value.trim(),
                imgDesc: desc.value.trim(),
                imgMoreDesc: moreDescription.value.trim(),
                imgSrc: media[0].url, // kept so anything still reading the old single-image field still works
                images: media.map(item => item.url), // flat URL list, kept for backward compatibility
                media, // {url, type} per item - lets the slider tell video from image
                "data-category": category.value,
                "data-difficulty": difficulty.value,
                "data-date": date.value.trim(),
                "code-language": languages.value.trim().toLowerCase()
            };

            if (editingProjectId) {
                await updateDoc(doc(db, "projects", editingProjectId), projectFields);
                console.log("Successfully updated in Firestore!");
                alert("Project updated!");
            } else {
                await addDoc(collection(db, "projects"), projectFields);
                console.log("Successfully saved to Firestore!");
                alert("Project added!");
            }

            // Clears the form/staged images and drops out of edit mode
            // either way (no-op on editingProjectId if we were adding).
            stopEditingProject();
            loadAdminProjects();
            
        } catch (error) {
            console.error("Error saving project:", error);
            alert(`Something went wrong: ${error.message}`);
        } finally {
            if (imageUploaderEl) imageUploaderEl.classList.remove("uploading");
            addProjectBtn.disabled = false;
            addProjectBtn.textContent = editingProjectId ? "Update Project" : "Add Project";
        }
    });
}

if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
        if (!confirm("Discard changes and stop editing this project?")) return;
        stopEditingProject();
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