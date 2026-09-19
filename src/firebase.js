import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC6HPgrp0YPkmx7yONTP4_qBhipSfzAEzM",
  authDomain: "pelee-kings.firebaseapp.com",
  projectId: "pelee-kings",
  storageBucket: "pelee-kings.firebasestorage.app",
  messagingSenderId: "180209953008",
  appId: "1:180209953008:web:a3061cc026fc5c808cba35",
  measurementId: "G-05WVDJS8X9",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
