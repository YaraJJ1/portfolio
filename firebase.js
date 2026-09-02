import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { db } from "./firebase.js";
import {
    getFirestore
} 
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDepBOMROJ5MrmUYAYpm5dcbWXME8ZB5Fg",
    authDomain: "portfolio-3c31a.firebaseapp.com",
    projectId: "portfolio-3c31a",
    storageBucket: "portfolio-3c31a.firebasestorage.app",
    messagingSenderId: "723210965924",
    appId: "1:723210965924:web:0813dfb9f9a537bf2be731",
    measurementId: "G-TWZTQX4HHG"
}

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };