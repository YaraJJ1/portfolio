const addProjectPage = document.querySelector('.addProjectPage');

const title = addProjectPage.querySelector('.Title');
const desc = addProjectPage.querySelector('.Description');
const date = addProjectPage.querySelector('.Date');
const img = addProjectPage.querySelector('.Img');
const category = addProjectPage.querySelector('.Category');
const difficulty = addProjectPage.querySelector('.Difficulty');
const moreDescription = addProjectPage.querySelector('.MoreDescription');
const addProjectBtn = addProjectPage.querySelector('.addProjectBtn');

console.log(addProjectBtn);
addProjectBtn.addEventListener("click", function () {
    const fields = [
    title,
    desc,
    date,
    img,
    category,
    difficulty,
    moreDescription
];

if (fields.some(field => field.value.trim() === "")) {
    alert("Please fill in all fields.");
    return;
}


});