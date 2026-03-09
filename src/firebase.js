import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAFOYClQGnuU8YsEeiNBBNdiebr5Np7iwg",
    authDomain: "meuportifolio-ab78e.firebaseapp.com",
    projectId: "meuportifolio-ab78e",
    storageBucket: "meuportifolio-ab78e.firebasestorage.app",
    messagingSenderId: "1080797653452",
    appId: "1:1080797653452:web:6f346e67cd9a316d979569",
    measurementId: "G-DGX7Q8K2QV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (Database)
const db = getFirestore(app);

export { db };
