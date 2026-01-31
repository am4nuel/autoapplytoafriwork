// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBkORDyMugXwT7Ap9lsogQQhV3X5ZWvjTY",
  authDomain: "auto-apply-f6ac3.firebaseapp.com",
  projectId: "auto-apply-f6ac3",
  storageBucket: "auto-apply-f6ac3.firebasestorage.app",
  messagingSenderId: "274176230170",
  appId: "1:274176230170:web:d1f8dde9e0a8adae8762a3",
  measurementId: "G-9V3WLFMTQF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { app, analytics, db };
