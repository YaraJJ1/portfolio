import { db } from "./firebase.js";
import {
    collection,
    addDoc
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

// check if the input the user writes down is right (so we check date, month, and year seperatly)
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
        imgMoreDesc: moreDescription.value. trim(),
        imgSrc: img.value.trim(),
        "data-category": category.value,
        "data-difficulty": difficulty.value,
        "data-date": date.value.trim(),
        "code-language": languages.value.trim().toLowerCase()
    };
    // disable the button so user cant spam it
    addProjectBtn.disabled = true;
    addProjectBtn.textContent = "Adding...";

    try {
        await addDoc(collection(db, "projects"), newProject);
        alert("Project added!");
        fields.forEach(field => field.value = "");
    } catch (error) {
        console.error("Error adding project:", error);
        alert("Something went wrong — check the console.");
    } finally {
        addProjectBtn.disabled = false;
        addProjectBtn.textContent = "Add Project";
    }
});