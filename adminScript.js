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

import {
    CATEGORY_LABELS,
    techLabel,
    techColor,
    escapeHTML
} from "./projects-data.js";

const auth = getAuth();

const loginContainer = document.getElementById("login-container");
const adminContent = document.getElementById("admin-content");
const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const loginMessage = document.getElementById("login-message");
const logoutBtn = document.getElementById("logout-btn");

// ---------- Friendly messages (instead of browser pop-ups) ----------
const formNotice = document.getElementById("form-notice");
const toastEl = document.getElementById("toast");
let toastTimer;

// Success messages pop up briefly at the bottom of the screen.
function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3000);
}

// Problems show in a box at the top of the form until dismissed or fixed.
function notify(message) {
    if (!formNotice) return toast(message);
    formNotice.querySelector(".notice-text").textContent = message;
    formNotice.hidden = false;
    formNotice.scrollIntoView({ behavior: "smooth", block: "center" });
}
function clearNotice() {
    if (formNotice) formNotice.hidden = true;
}
if (formNotice) formNotice.querySelector(".notice-close").addEventListener("click", clearNotice);

function showLoginMessage(message) {
    if (!loginMessage) return;
    loginMessage.textContent = message;
    loginMessage.hidden = !message;
}

const LOGIN_ERRORS = {
    "auth/invalid-credential": "That email and password don't match. Please try again.",
    "auth/wrong-password": "That password isn't right. Please try again.",
    "auth/user-not-found": "There's no account with that email.",
    "auth/invalid-email": "That doesn't look like a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
    "auth/network-request-failed": "Can't reach the server. Check your internet connection."
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        if (loginContainer) loginContainer.style.display = "none";
        if (adminContent) {
            adminContent.style.display = "block";
            adminContent.removeAttribute("hidden");
        }
        const signedIn = document.getElementById("signed-in-as");
        if (signedIn) signedIn.textContent = user.email || "";
        showLoginMessage("");
        loadAdminProjects();
    } else {
        if (loginContainer) loginContainer.style.display = "";
        if (adminContent) adminContent.style.display = "none";
        GITHUB_TOKEN = null; // clear any cached token on logout
    }
});

if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const email = document.getElementById("admin-email").value.trim();
        const password = document.getElementById("admin-password").value;

        if (!email || !password) {
            showLoginMessage("Please enter your email and password.");
            return;
        }

        showLoginMessage("");
        loginBtn.disabled = true;
        loginBtn.textContent = "Signing in…";

        signInWithEmailAndPassword(auth, email, password)
            .catch((error) => {
                showLoginMessage(LOGIN_ERRORS[error.code] || `Couldn't sign in (${error.code || error.message}).`);
            })
            .finally(() => {
                loginBtn.disabled = false;
                loginBtn.textContent = "Sign in";
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

// The date field is a calendar picker (yyyy-mm-dd); projects store dd/mm/yyyy.
function isoToStored(iso) {
    const [y, m, d] = String(iso || "").split("-");
    return y && m && d ? `${d}/${m}/${y}` : "";
}
function storedToIso(stored) {
    const [d, m, y] = String(stored || "").split("/");
    return y && m && d ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : "";
}


//
const addProjectPage = document.querySelector('#admin-content .addProjectPage');

const title = addProjectPage.querySelector('.Title');
const desc = addProjectPage.querySelector('.Description');
const date = addProjectPage.querySelector('.Date');
const category = addProjectPage.querySelector('.Category');
const difficulty = addProjectPage.querySelector('.Difficulty');
const moreDescription = addProjectPage.querySelector('.MoreDescription'); // contenteditable rich-text box, not a textarea
const moreDescriptionToolbar = addProjectPage.querySelector('.richToolbar');
const languages = addProjectPage.querySelector('.Languages');
const githubLink = addProjectPage.querySelector('.GithubLink'); // optional - intentionally left out of requiredFields
const addProjectBtn = document.getElementById('submit-project-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const addHeader = addProjectPage.querySelector('.addHeader');

// Value-based fields required for both adding a new project and saving
// edits to one. The inner description is required too, but it's a
// contenteditable box (no .value), so it's checked separately with
// moreDescriptionHasText().
const requiredFields = [title, desc, date, category, difficulty, languages];


const adminProjectList = document.querySelector('.adminProjectList');

const inputFile = document.getElementById('input-file');
const imageUploaderEl = document.getElementById('image-uploader');
const imageListEl = document.getElementById('image-list');
const uploadHintEl = document.getElementById('upload-hint');

const formModeEl = document.getElementById('form-mode');
const newProjectBtn = document.getElementById('new-project-btn');
const descCountEl = document.getElementById('desc-count');
const tagPreviewEl = document.getElementById('tag-preview');
const projectCountEl = document.getElementById('project-count');

// Live character count under the short summary.
function updateDescCount() {
    if (!descCountEl) return;
    const max = desc.maxLength > 0 ? desc.maxLength : 400;
    descCountEl.textContent = `${desc.value.length} / ${max}`;
}
desc.addEventListener("input", updateDescCount);
updateDescCount();

// Live preview of the coloured tags exactly as they'll look on the site.
function updateTagPreview() {
    if (!tagPreviewEl) return;
    const keys = languages.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    tagPreviewEl.innerHTML = keys.length
        ? `<span class="preview-label">Preview:</span>` + keys.map(k =>
            `<span class="tag" style="--tag:${techColor(k)}">${escapeHTML(techLabel(k))}</span>`).join("")
        : "";
}
languages.addEventListener("input", updateTagPreview);

// Clear the "please fix this" box and highlight as soon as the user starts fixing things.
addProjectPage.addEventListener("input", (event) => {
    clearNotice();
    if (event.target.classList) event.target.classList.remove("is-missing");
});

if (newProjectBtn) {
    newProjectBtn.addEventListener("click", () => {
        if (editingProjectId && !confirm("Stop editing this project? Unsaved changes will be lost.")) return;
        stopEditingProject();
        addProjectPage.scrollIntoView({ behavior: "smooth", block: "start" });
        title.focus({ preventScroll: true });
    });
}


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

// GitHub link is optional - blank is always valid. If something is typed,
// it just has to be a well-formed http(s) URL.
function isValidGithubLink(value) {
    if (!value) return true;
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

// ---------- Inner description rich-text editor ----------
// The inner description is a contenteditable box so it can hold line
// breaks, bold and underline. It's saved to Firestore (imgMoreDesc) as a
// small sanitized HTML string - only <b>, <u> and <br> are ever stored -
// so the public page shows the line breaks and formatting when it puts
// imgMoreDesc on the page with innerHTML.
//
// Older projects saved imgMoreDesc as plain text with "\n" newlines; those
// are converted to <br> when loaded into the editor, so re-saving them
// upgrades them to the new format.

const RICH_BLOCK_TAGS = new Set([
    "div", "p", "li", "ul", "ol", "blockquote", "pre",
    "h1", "h2", "h3", "h4", "h5", "h6"
]);

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function isBoldElement(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === "b" || tag === "strong") return true;
    const weight = el.style ? el.style.fontWeight : "";
    return weight === "bold" || weight === "bolder" || Number(weight) >= 600;
}

function isUnderlineElement(el) {
    if (el.tagName.toLowerCase() === "u") return true;
    const decoration = el.style
        ? `${el.style.textDecoration || ""} ${el.style.textDecorationLine || ""}`
        : "";
    return decoration.includes("underline");
}

// Walks the editor's DOM and rebuilds it as clean HTML. Browsers turn
// Enter into <div>s (or <br>s, depending on the browser) - every block
// boundary becomes a single <br> so a new line is always exactly one new
// line, and blank lines are kept.
function serializeRichNodes(parent, state, out) {
    parent.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            const lines = node.nodeValue.split("\n");
            lines.forEach((line, i) => {
                if (i > 0) {
                    out.push("<br>");
                    state.atLineStart = true;
                }
                if (line) {
                    out.push(escapeHtml(line));
                    state.atLineStart = false;
                }
            });
            return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const tag = node.tagName.toLowerCase();

        if (tag === "br") {
            out.push("<br>");
            state.atLineStart = true;
            return;
        }

        if (tag === "script" || tag === "style") return;

        const isBlock = RICH_BLOCK_TAGS.has(tag);
        if (isBlock && !state.atLineStart) {
            out.push("<br>");
            state.atLineStart = true;
        }

        const opensBold = !state.bold && isBoldElement(node);
        const opensUnderline = !state.underline && isUnderlineElement(node);

        if (opensBold) { out.push("<b>"); state.bold = true; }
        if (opensUnderline) { out.push("<u>"); state.underline = true; }

        serializeRichNodes(node, state, out);

        if (opensUnderline) { out.push("</u>"); state.underline = false; }
        if (opensBold) { out.push("</b>"); state.bold = false; }

        if (isBlock && !state.atLineStart) {
            out.push("<br>");
            state.atLineStart = true;
        }
    });
}

function serializeRichContent(root) {
    const out = [];
    serializeRichNodes(root, { atLineStart: true, bold: false, underline: false }, out);

    let html = out.join("");
    let previous;
    do {
        previous = html;
        html = html
            .replace(/<(b|u)><\/\1>/g, "")                       // empty <b></b> / <u></u>
            .replace(/^((?:<[bu]>)*)(?:<br>)+/, "$1")              // leading blank lines
            .replace(/(?:<br>)+((?:<\/[bu]>)*)$/, "$1");           // trailing blank lines
    } while (html !== previous);

    return html;
}

// Parses stored HTML in an inert <template> (nothing in it runs or loads)
// and re-serializes it, so only <b>, <u> and <br> can ever reach the editor.
function sanitizeRichHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = html;
    return serializeRichContent(template.content);
}

function plainTextToRichHtml(text) {
    return escapeHtml(text.replace(/\r\n?/g, "\n")).replace(/\n/g, "<br>");
}

function looksLikeRichHtml(value) {
    return /<\/?(b|u|br|strong)\b[^>]*>/i.test(value);
}

function getMoreDescriptionHtml() {
    return serializeRichContent(moreDescription);
}

function setMoreDescriptionHtml(value) {
    const text = value || "";
    moreDescription.innerHTML = looksLikeRichHtml(text)
        ? sanitizeRichHtml(text)
        : plainTextToRichHtml(text);
    updateMoreDescriptionState();
    updateRichToolbarState();
}

function moreDescriptionHasText() {
    return moreDescription.textContent.trim() !== "";
}

// Shows the placeholder only while the box is truly empty (browsers often
// leave a stray <br> behind after everything is deleted).
function updateMoreDescriptionState() {
    const html = moreDescription.innerHTML.trim().toLowerCase();
    const isEmpty = !moreDescription.textContent &&
        /^(|<br>|<div><br><\/div>|<p><br><\/p>)$/.test(html);
    moreDescription.classList.toggle("is-empty", isEmpty);
}

function selectionIsInMoreDescription() {
    const selection = document.getSelection();
    return !!selection &&
        selection.rangeCount > 0 &&
        moreDescription.contains(selection.anchorNode);
}

// Highlights the B / U buttons when the caret is inside bold / underlined text.
function updateRichToolbarState() {
    if (!moreDescriptionToolbar) return;

    const inEditor = selectionIsInMoreDescription();

    moreDescriptionToolbar.querySelectorAll(".richBtn").forEach(button => {
        let isOn = false;
        if (inEditor) {
            try {
                isOn = document.queryCommandState(button.dataset.command);
            } catch {
                isOn = false;
            }
        }
        button.classList.toggle("is-active", isOn);
        button.setAttribute("aria-pressed", isOn ? "true" : "false");
    });
}

function applyRichCommand(command) {
    const selection = document.getSelection();
    const savedRange = selectionIsInMoreDescription()
        ? selection.getRangeAt(0).cloneRange()
        : null;

    moreDescription.focus();

    if (savedRange) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
    }

    document.execCommand("styleWithCSS", false, false); // use <b>/<u>, not styled <span>s
    document.execCommand(command, false, null);

    updateMoreDescriptionState();
    updateRichToolbarState();
}

if (moreDescriptionToolbar) {
    // mousedown + preventDefault stops the button from stealing focus, so
    // the text selected in the editor stays selected when B / U is clicked.
    moreDescriptionToolbar.addEventListener("mousedown", (event) => {
        if (event.target.closest(".richBtn")) event.preventDefault();
    });

    moreDescriptionToolbar.addEventListener("click", (event) => {
        const button = event.target.closest(".richBtn");
        if (!button) return;
        applyRichCommand(button.dataset.command);
    });
}

if (moreDescription) {
    moreDescription.addEventListener("input", () => {
        updateMoreDescriptionState();
        updateRichToolbarState();
    });

    // Paste as plain text so copied styles/fonts/colors don't come along.
    // Bold/underline can then be added with the toolbar or Ctrl+B / Ctrl+U.
    moreDescription.addEventListener("paste", (event) => {
        event.preventDefault();
        const text = (event.clipboardData || window.clipboardData).getData("text/plain");
        document.execCommand("insertText", false, text);
    });

    // Don't let dropped files (e.g. an image meant for the uploader) land
    // inside the description.
    moreDescription.addEventListener("drop", (event) => {
        if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length) {
            event.preventDefault();
        }
    });

    document.addEventListener("selectionchange", updateRichToolbarState);

    // Tab indents the current line, Shift+Tab outdents it - by default a
    // contenteditable box just lets Tab move focus away instead of typing
    // anything. Indentation is built from \u00A0 (non-breaking space)
    // rather than plain spaces: regular spaces collapse down to one when
    // rendered as HTML (both here and on the public page), so typed
    // indentation would otherwise disappear the moment it's displayed.
    // Because serializeRichContent() just copies text-node characters
    // through untouched, this indentation is preserved end to end.
    const INDENT = "\u00A0\u00A0\u00A0\u00A0";

    moreDescription.addEventListener("keydown", (event) => {
        if (event.key !== "Tab") return;
        event.preventDefault();

        const selection = document.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);

        if (event.shiftKey) {
            // Outdent: strip up to one INDENT's worth of trailing nbsp from
            // directly before the caret, if that's what's there.
            const node = range.startContainer;
            if (node.nodeType === Node.TEXT_NODE) {
                const before = node.nodeValue.slice(0, range.startOffset);
                const trimmed = before.endsWith(INDENT)
                    ? before.slice(0, -INDENT.length)
                    : before.replace(/\u00A0+$/, "");
                const removed = before.length - trimmed.length;
                if (removed > 0) {
                    node.nodeValue = trimmed + node.nodeValue.slice(range.startOffset);
                    const newRange = document.createRange();
                    newRange.setStart(node, range.startOffset - removed);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                }
            }
        } else {
            document.execCommand("insertText", false, INDENT);
        }

        updateMoreDescriptionState();
        updateRichToolbarState();
    });

    updateMoreDescriptionState();
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

        if (projectCountEl) projectCountEl.textContent = querySnapshot.size ? `(${querySnapshot.size})` : "";

        if (querySnapshot.empty) {
            adminProjectList.innerHTML = `<li class="list-empty">No projects yet. Add your first one with the form.</li>`;
            return;
        }

        // Newest first, so recent work is easy to find.
        const toTime = s => { const [d, m, y] = String(s || "").split("/").map(Number); return y ? new Date(y, (m || 1) - 1, d || 1).getTime() : 0; };
        const docs = querySnapshot.docs.slice().sort((a, b) => toTime(b.data()["data-date"]) - toTime(a.data()["data-date"]));

        docs.forEach((docSnap) => {
            const project = docSnap.data();
            adminProjectsById.set(docSnap.id, project);

            const media = Array.isArray(project.media) && project.media.length
                ? project.media
                : (project.imgSrc ? [{ url: project.imgSrc, type: "image" }] : []);
            const thumb = (media.find(m => m.type !== "video") || {}).url || "images.png";
            const metaParts = [
                CATEGORY_LABELS[project["data-category"]] || project["data-category"],
                project["data-date"]
            ].filter(Boolean);

            const item = document.createElement("li");
            item.classList.add("adminProjectItem");
            item.dataset.id = docSnap.id;
            if (docSnap.id === editingProjectId) item.classList.add("is-editing");

            item.innerHTML = `
                <img class="adminProjectThumb" src="${escapeHTML(thumb)}" alt="" loading="lazy">
                <span class="adminProjectInfo">
                    <span class="adminProjectName">${escapeHTML(project.imgTxt || "Untitled")}</span>
                    <span class="adminProjectMeta">${escapeHTML(metaParts.join(" · "))}</span>
                </span>
                <span class="adminProjectActions">
                    <button class="editBtn" data-id="${escapeHTML(docSnap.id)}" type="button">Edit</button>
                    <button class="deleteBtn" data-id="${escapeHTML(docSnap.id)}" type="button" aria-label="Delete ${escapeHTML(project.imgTxt || "project")}">Delete</button>
                </span>
            `;

            adminProjectList.appendChild(item);
        });

    } catch (error) {
        console.error("Error loading admin projects:", error);
       
        adminProjectList.innerHTML = `<li class="list-empty">Couldn't load your projects (${escapeHTML(error.code || error.message)}). Try refreshing the page.</li>`;
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

        const name = (adminProjectsById.get(id) || {}).imgTxt || "this project";
        const confirmed = confirm(`Delete "${name}" from your website?\n\nThis can't be undone.`);
        if (!confirmed) return;

        deleteButton.disabled = true;
        deleteButton.textContent = "Deleting…";

        try {
            await deleteDoc(doc(db, "projects", id));
            // If the project being deleted is the one currently loaded into
            // the form, back out of edit mode so a leftover "Update Project"
            // click can't try to update a doc that no longer exists.
            if (editingProjectId === id) stopEditingProject();
            loadAdminProjects();
            toast(`Deleted "${name}".`);
        } catch (error) {
            console.error("Error deleting project:", error);
            notify(`Couldn't delete "${name}" (${error.code || error.message}). Please try again.`);
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
        notify("Couldn't find that project's data. Try refreshing the page.");
        return;
    }

    clearNotice();
    editingProjectId = id;

    title.value = project.imgTxt || "";
    desc.value = project.imgDesc || "";
    date.value = storedToIso(project["data-date"]);
    if (project["data-category"]) category.value = project["data-category"];
    if (project["data-difficulty"]) difficulty.value = project["data-difficulty"];
    setMoreDescriptionHtml(project.imgMoreDesc || "");
    languages.value = project["code-language"] || "";
    if (githubLink) githubLink.value = project.githubLink || "";

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

    addProjectBtn.textContent = "Save changes";
    if (cancelEditBtn) cancelEditBtn.hidden = false;
    if (addHeader) addHeader.textContent = project.imgTxt || "Untitled";
    if (formModeEl) formModeEl.textContent = "Editing";
    addProjectPage.classList.add("is-editing");
    highlightEditingItem();
    updateDescCount();
    updateTagPreview();

    addProjectPage.scrollIntoView({ behavior: "smooth", block: "start" });
}

function highlightEditingItem() {
    if (!adminProjectList) return;
    adminProjectList.querySelectorAll(".adminProjectItem").forEach(li => {
        li.classList.toggle("is-editing", li.dataset.id === editingProjectId);
    });
}

// Clears the form and drops out of edit mode, back to "Add a new project".
function stopEditingProject() {
    editingProjectId = null;

    requiredFields.forEach(field => {
        if (field) field.value = "";
    });
    // Dropdowns go back to their first choice instead of blank.
    category.selectedIndex = 0;
    difficulty.selectedIndex = 0;
    addProjectPage.querySelectorAll(".is-missing").forEach(el => el.classList.remove("is-missing"));
    setMoreDescriptionHtml("");
    if (githubLink) githubLink.value = "";
    resetImagePicker();

    addProjectBtn.textContent = "Add Project";
    if (cancelEditBtn) cancelEditBtn.hidden = true;
    if (addHeader) addHeader.textContent = "Add a project";
    if (formModeEl) formModeEl.textContent = "New project";
    addProjectPage.classList.remove("is-editing");
    clearNotice();
    highlightEditingItem();
    updateDescCount();
    updateTagPreview();
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
                ? `<video src="${escapeHTML(item.url)}" class="image-thumb" muted playsinline preload="metadata"></video>`
                : `<img src="${escapeHTML(item.url)}" class="image-thumb" alt="">`;

            return `
                <li class="image-tile${index === 0 ? " is-thumb" : ""}">
                    ${mediaHtml}
                    ${index === 0 ? '<span class="image-badge">Thumbnail</span>' : ""}
                    ${item.type === "video" ? '<span class="image-badge image-badge--video">Video</span>' : ""}
                    <div class="image-controls">
                        <button type="button" class="moveLeftBtn" data-index="${index}" ${index === 0 ? "disabled" : ""} aria-label="Move earlier" title="Move earlier">‹</button>
                        <button type="button" class="removeImageBtn" data-index="${index}" aria-label="Remove" title="Remove">×</button>
                        <button type="button" class="moveRightBtn" data-index="${index}" ${index === stagedImages.length - 1 ? "disabled" : ""} aria-label="Move later" title="Move later">›</button>
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
            ? `${count} file${count > 1 ? "s" : ""}. Drag more onto the box to add them.`
            : "No files yet. Click “Add files” or drag images and videos onto the box.";
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
        clearNotice();

        // Name the exact fields that are still empty, and highlight them.
        const fieldNames = new Map([
            [title, "project name"], [desc, "short summary"], [date, "date"],
            [category, "category"], [difficulty, "difficulty"], [languages, "languages & tools"]
        ]);
        addProjectPage.querySelectorAll(".is-missing").forEach(el => el.classList.remove("is-missing"));
        const missing = requiredFields.filter(field => !field || !field.value || field.value.trim() === "");
        const descMissing = !moreDescription || !moreDescriptionHasText();
        if (missing.length || descMissing) {
            missing.forEach(field => field && field.classList.add("is-missing"));
            if (descMissing && moreDescription) moreDescription.classList.add("is-missing");
            const names = missing.map(f => fieldNames.get(f)).concat(descMissing ? ["full description"] : []);
            notify(`Almost there! Please fill in: ${names.join(", ")}.`);
            return;
        }

        const storedDate = isoToStored(date.value);
        if (!isValidDateFormat(storedDate)) {
            date.classList.add("is-missing");
            notify("Please pick the date from the calendar.");
            return;
        }

        const githubLinkValue = githubLink ? githubLink.value.trim() : "";
        if (!isValidGithubLink(githubLinkValue)) {
            githubLink.classList.add("is-missing");
            notify("The GitHub link should start with https:// (or leave it empty).");
            return;
        }

        if (!stagedImages.length) {
            notify("Please add at least one image or video.");
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
                    addProjectBtn.textContent = `Uploading ${label} ${i + 1} of ${stagedImages.length}…`;
                    const url = await uploadMediaToGithub(staged.file, title.value.trim(), i, staged.type);
                    media.push({ url, type: staged.type });
                } else {
                    // Carried over from the project being edited - already
                    // hosted on GitHub/jsDelivr, nothing to upload.
                    media.push({ url: staged.url, type: staged.type });
                }
            }
            addProjectBtn.textContent = editingProjectId ? "Saving…" : "Adding…";

            const projectFields = {
                imgTxt: title.value.trim(),
                imgDesc: desc.value.trim(),
                imgMoreDesc: getMoreDescriptionHtml(), // sanitized HTML: only <b>, <u>, <br>
                imgSrc: media[0].url, // kept so anything still reading the old single-image field still works
                images: media.map(item => item.url), // flat URL list, kept for backward compatibility
                media, // {url, type} per item - lets the slider tell video from image
                "data-category": category.value,
                "data-difficulty": difficulty.value,
                "data-date": storedDate,
                "code-language": languages.value.trim().toLowerCase(),
                githubLink: githubLinkValue // optional - empty string means "no icon" on the public page
            };

            if (editingProjectId) {
                await updateDoc(doc(db, "projects", editingProjectId), projectFields);
                toast(`Saved "${projectFields.imgTxt}". It's live on your website.`);
            } else {
                await addDoc(collection(db, "projects"), projectFields);
                toast(`Added "${projectFields.imgTxt}". It's live on your website.`);
            }

            // Clears the form/staged images and drops out of edit mode
            // either way (no-op on editingProjectId if we were adding).
            stopEditingProject();
            loadAdminProjects();
            
        } catch (error) {
            console.error("Error saving project:", error);
            notify(`Something went wrong, so nothing was saved: ${error.message}`);
        } finally {
            if (imageUploaderEl) imageUploaderEl.classList.remove("uploading");
            addProjectBtn.disabled = false;
            addProjectBtn.textContent = editingProjectId ? "Save changes" : "Add Project";
        }
    });
}

if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
        if (!confirm("Stop editing? Any changes you haven't saved will be lost.")) return;
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