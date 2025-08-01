// Import the functions you need from the SDKs you need 
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.8.0/firebase-analytics.js";

// Your web app's Firebase configuration 
// For Firebase JS SDK v7.20.0 and later, measurementId is optional 
const firebaseConfig = { 
  apiKey: "AIzaSyApE8wMe5Ax5Fr2RSFNiD-RNj1G36xV-kw", 
  authDomain: "exam-portal-76d53.firebaseapp.com", 
  projectId: "exam-portal-76d53", 
  storageBucket: "exam-portal-76d53.firebasestorage.app", 
  messagingSenderId: "1003079240160", 
  appId: "1:1003079240160:web:bb61258949b3f2c1fd0385", 
  measurementId: "G-BV4DGQ7Q37" 
};

// Initialize Firebase 
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { auth, db, analytics };