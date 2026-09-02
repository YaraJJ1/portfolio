// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDepBOMROJ5MrmUYAYpm5dcbWXME8ZB5Fg",
  authDomain: "portfolio-3c31a.firebaseapp.com",
  projectId: "portfolio-3c31a",
  storageBucket: "portfolio-3c31a.firebasestorage.app",
  messagingSenderId: "723210965924",
  appId: "1:723210965924:web:0813dfb9f9a537bf2be731",
  measurementId: "G-TWZTQX4HHG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);