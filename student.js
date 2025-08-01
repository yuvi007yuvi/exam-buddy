import { auth, db, analytics } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.8.0/firebase-auth.js";
import { doc, getDoc, collection, query, orderBy, getDocs, where } from "https://www.gstatic.com/firebasejs/9.8.0/firebase-firestore.js";

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
    const logoutBtn = document.getElementById('logoutBtn');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Check user role
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists() && userDocSnap.data().role === 'student') {
                console.log('Student logged in:', user.email);
                const userData = userDocSnap.data();
                // Display student name if available
                const studentNameElement = document.getElementById('studentName');
                const navUserNameDisplay = document.getElementById('navUserNameDisplay');
                if (studentNameElement) {
                    studentNameElement.textContent = userData.name || user.email.split('@')[0];
                }
                if (navUserNameDisplay) {
                    navUserNameDisplay.textContent = userData.name || user.email.split('@')[0];
                }
                fetchAndDisplayMyResults(user.uid);
                fetchAndDisplayExams();
                updateDashboardSummary(user.uid);
            } else {
                alert('Access Denied: You are not a student.');
                redirectToLogin();
            }
        } else {
            // No user is signed in
            redirectToLogin();
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            console.log('User signed out');
            redirectToLogin();
        } catch (error) {
            console.error('Error signing out:', error.message);
            alert('Error signing out: ' + error.message);
        }
    });

    function redirectToLogin() {
        window.location.href = 'home.html';
    }

    async function fetchAndDisplayExams() {
        const examsList = document.getElementById('examsList');
        examsList.innerHTML = ''; // Clear previous exams

        try {
            const q = query(collection(db, "exams"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                examsList.innerHTML = '<div class="text-center p-6 text-gray-400">No exams available at the moment.</div>';
                return;
            }

            querySnapshot.forEach((doc) => {
                const exam = doc.data();
                const examItem = document.createElement('div');
                examItem.className = 'summary-card transition-all duration-300';
                
                // Format time limit
                const timeLimit = exam.timeLimit ? `${exam.timeLimit} minutes` : 'No time limit';
                
                examItem.innerHTML = `
                    <div class="flex flex-col h-full">
                        <h3 class="text-xl font-bold neon-text mb-2">${exam.title}</h3>
                        <p class="text-gray-400 mb-4 flex-grow">${exam.description}</p>
                        <div class="flex justify-between items-center text-sm text-gray-500 mb-4">
                            <span>Time: ${timeLimit}</span>
                            <span>${exam.questions ? exam.questions.length : 0} Questions</span>
                        </div>
                        <button class="btn-primary start-exam-btn w-full" data-exam-id="${doc.id}">
                            Start Exam
                        </button>
                    </div>
                `;
                examsList.appendChild(examItem);
            });
        } catch (error) {
            console.error('Error fetching exams:', error);
            examsList.innerHTML = '<div class="text-center p-6 text-red-400">Error loading exams. Please try again later.</div>';
        }
    }

    // Delegate start button clicks
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('start-exam-btn')) {
            const examId = event.target.dataset.examId;
            startExam(examId);
        }
    });

    function startExam(examId) {
        // Implement actual exam start logic here
        window.location.href = `exam.html?examId=${examId}`;
    }
    
    async function fetchAndDisplayMyResults(userId) {
        const myResultsList = document.getElementById('myResultsList');
        myResultsList.innerHTML = ''; // Clear previous results

        try {
            const q = query(collection(db, "examResults"), where("userId", "==", userId), orderBy("submittedAt", "desc"));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                myResultsList.innerHTML = '<div class="text-center p-6 text-gray-400">No exam results found yet.</div>';
                return;
            }

            const resultPromises = [];

            querySnapshot.forEach((resultDoc) => {
                const result = resultDoc.data();
                resultPromises.push(
                    getDoc(doc(db, "exams", result.examId)).then(examSnap => {
                        const examTitle = examSnap.exists() ? examSnap.data().title : 'Unknown Exam';
                        const resultItem = document.createElement('div');
                        resultItem.className = 'summary-card transition-all duration-300';
                        resultItem.innerHTML = `
                            <div class="flex flex-col h-full">
                                <h3 class="text-xl font-bold neon-text-violet mb-2">${examTitle}</h3>
                                <p class="text-gray-400 mb-2">Score: ${result.score}/${result.totalQuestions}</p>
                                <p class="text-gray-400 text-sm">Submitted: ${new Date(result.submittedAt.toDate()).toLocaleString()}</p>
                                <button data-result-id="${resultDoc.id}" class="view-details-btn btn-secondary w-full mt-4">View Details</button>
                            </div>
                        `;
                        return resultItem;
                    })
                );
            });

            const resultItems = await Promise.all(resultPromises);
            resultItems.forEach(item => myResultsList.appendChild(item));

            // Attach click events to view details buttons (if needed)
            document.querySelectorAll('#myResultsList .view-details-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const resultId = e.target.dataset.resultId;
                    alert(`View details for result ID: ${resultId} (Functionality to be implemented)`);
                    // window.location.href = `result-details.html?resultId=${resultId}`;
                });
            });

        } catch (error) {
            console.error('Error fetching student results:', error);
            myResultsList.innerHTML = '<div class="text-center p-6 text-red-400">Error loading your results. Please try again later.</div>';
        }
    }

    async function updateDashboardSummary(userId) {
        try {
            // Get elements
            const upcomingExamsCount = document.getElementById('upcomingExamsCount');
            const completedExamsCount = document.getElementById('completedExamsCount');
            const averageScore = document.getElementById('averageScore');
            
            // Get all exams count for upcoming exams
            const examsQuery = query(collection(db, "exams"));
            const examsSnapshot = await getDocs(examsQuery);
            upcomingExamsCount.textContent = examsSnapshot.size;
            
            // Get completed exams (from examResults collection)
            const resultsQuery = query(
                collection(db, "examResults"), 
                where("userId", "==", userId)
            );
            const resultsSnapshot = await getDocs(resultsQuery);
            
            // Update completed exams count
            completedExamsCount.textContent = resultsSnapshot.size;
            
            // Calculate average score
            if (resultsSnapshot.size > 0) {
                let totalScore = 0;
                resultsSnapshot.forEach(doc => {
                    const result = doc.data();
                    totalScore += result.score;
                });
                const avgScore = (totalScore / resultsSnapshot.size).toFixed(1);
                averageScore.textContent = avgScore + '%';
            } else {
                averageScore.textContent = 'N/A';
            }
            
            // Add pulse animation to cards
            document.querySelectorAll('.summary-card').forEach(card => {
                card.classList.add('pulse');
            });
            
        } catch (error) {
            console.error('Error updating dashboard summary:', error);
        }
    }
});
