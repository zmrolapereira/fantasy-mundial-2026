import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDiC2TFrfkFhgjkuqB6fK3zhis0wA_qUXI",
  authDomain: "fantasy-mundial-2026.firebaseapp.com",
  projectId: "fantasy-mundial-2026",
  storageBucket: "fantasy-mundial-2026.firebasestorage.app",
  messagingSenderId: "814775466865",
  appId: "1:814775466865:web:44c80fdf23e7d7732294d0",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);