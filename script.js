import { auth, db, analytics } from './firebase-config.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.8.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const body = document.body;

    // Function to set theme
    function setTheme(theme) {
        body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        if (theme === 'dark') {
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }

    // Apply saved theme or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    // Toggle theme on button click
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });

    // Responsive Navbar Toggle
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const navbarLinks = document.getElementById('navbar-links');

    if (hamburgerMenu && navbarLinks) {
        hamburgerMenu.addEventListener('click', () => {
            navbarLinks.classList.toggle('active');
        });
    }

    const authForm = document.getElementById('authForm');
    const emailInput = document.getElementById('email-address');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const authMessage = document.getElementById('authMessage');
    const registerLink = document.getElementById('registerLink');

    let isRegistering = false;

    // Check auth state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in, redirect to dashboard based on role
            checkUserRole(user);
        } else {
            // User is signed out
            console.log('User is signed out');
            // Redirect to home.html if user is signed out and on the root (index.html) page
            // Allow guests to view index.html
            // No redirection needed if user is signed out and on index.html
        }
    });

    // Register link event listener is now handled in the updateFormMode function

    function updateFormMode() {
        const nameInputContainer = document.getElementById('nameInputContainer');
        
        if (isRegistering) {
            // If name input doesn't exist, create it
            if (!nameInputContainer) {
                const container = document.createElement('div');
                container.id = 'nameInputContainer';
                container.innerHTML = `
                    <label for="name" class="sr-only">Full Name</label>
                    <input id="name" name="name" type="text" required
                           class="appearance-none relative block w-full px-4 py-3 border-0 bg-opacity-20 bg-gray-800 placeholder-gray-400 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent sm:text-sm"
                           placeholder="Full Name">
                `;
                // Insert before password field
                emailInput.parentNode.parentNode.insertBefore(container, emailInput.parentNode.nextSibling);
            }
            if (loginBtn) loginBtn.textContent = 'Register';
            if (registerLink) registerLink.textContent = 'Already have an account? Login';
            if (authMessage) authMessage.textContent = '';
        } else {
            // Remove name input if it exists
            if (nameInputContainer) {
                nameInputContainer.remove();
            }
            if (loginBtn) loginBtn.textContent = 'Sign in';
            if (registerLink) registerLink.textContent = 'Don\'t have an account? Register';
            if (authMessage) authMessage.textContent = '';
        }
    }

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = emailInput.value;
            const password = passwordInput.value;
            
            if (authMessage) authMessage.textContent = '';

            if (isRegistering) {
                // Register user
                try {
                    const nameInput = document.getElementById('name');
                    const name = nameInput ? nameInput.value : '';
                    
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    const user = userCredential.user;
                    // Assign 'student' role by default and store name
                    await setDoc(doc(db, "users", user.uid), {
                        email: user.email,
                        name: name,
                        role: 'student'
                    });
                    console.log('User registered and role assigned:', user);
                    if (authMessage) authMessage.textContent = 'Registration successful! Logging in...';
                    // Redirect after successful registration and role assignment
                    checkUserRole(user);
                } catch (error) {
                    console.error('Error during registration:', error.message);
                    if (authMessage) authMessage.textContent = `Registration failed: ${error.message}`;
                }
            } else {
                // Login user
                try {
                    const userCredential = await signInWithEmailAndPassword(auth, email, password);
                    const user = userCredential.user;
                    console.log('User logged in:', user);
                    if (authMessage) authMessage.textContent = 'Login successful! Redirecting...';
                    // Redirect after successful login
                    checkUserRole(user);
                } catch (error) {
                    console.error('Error during login:', error.message);
                    if (authMessage) authMessage.textContent = `Login failed: ${error.message}`;
                }
            }
        });
    }

    // Handle Google Sign-In
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;

                // Check if user exists in Firestore, if not, create a new entry with default role 'student'
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (!userDocSnap.exists()) {
                    // Get display name from Google account or use email username as fallback
                    const displayName = user.displayName || user.email.split('@')[0];
                    
                    await setDoc(userDocRef, {
                        email: user.email,
                        name: displayName,
                        role: 'student' // Default role for Google sign-ins
                    });
                }

                    // Redirect based on role
                    checkUserRole(user);
            } catch (error) {
                console.error('Error during Google Sign-In:', error);
                authMessage.textContent = `Google Sign-In failed: ${error.message}`;
            }
        });
    }

    async function checkUserRole(user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.role === 'admin') {
                window.location.href = 'admin.html'; // Redirect to admin dashboard
            } else {
                window.location.href = 'student.html'; // Redirect to student dashboard
            }
        } else {
            // If user document doesn't exist (e.g., new user registered without role set immediately)
            // This case should ideally be handled during registration, but as a fallback:
            console.warn('User document not found for:', user.uid, 'Assigning default student role.');
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                role: 'student'
            });
            window.location.href = 'student.html';
        }
    }
});