// src/firebase.js

// Import the functions you need
// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCEgpjdRVUUigUDuM9qv742FwuVrI_Sas4",
  authDomain: "ceybreeze-tours-a102e.firebaseapp.com",
  projectId: "ceybreeze-tours-a102e",
  storageBucket: "ceybreeze-tours-a102e.firebasestorage.app",
  messagingSenderId: "946480612796",
  appId: "1:946480612796:web:ce0f87c63e878353bd97b9",
  measurementId: "G-GZFBX19TEF"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;



