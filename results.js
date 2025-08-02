import { auth, db } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.8.0/firebase-auth.js";

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
    const examTitleElement = document.getElementById('examTitle');
    const totalSubmissionsElement = document.getElementById('totalSubmissions');
    const averageScoreElement = document.getElementById('averageScore');
    const resultsTableBody = document.getElementById('resultsTableBody');

    const urlParams = new URLSearchParams(window.location.search);
    const examId = urlParams.get('examId');
    
    // Initialize variables for exam selection
    let exams = [];
    let selectedExamId = examId;
    
    // Show exam selector if no examId is provided
    const examSelectorContainer = document.getElementById('examSelectorContainer');
    if (!examId && examSelectorContainer) {
        examSelectorContainer.style.display = 'block';
    }

    // Function to load exam data and display results
    async function loadExamResults(examId) {
        if (!examId) {
            // Hide results sections if no exam is selected
            document.querySelector('.mb-6').style.display = 'none';
            document.querySelector('.overflow-x-auto').style.display = 'none';
            return;
        }
        
        // Show results sections
        document.querySelector('.mb-6').style.display = 'block';
        document.querySelector('.overflow-x-auto').style.display = 'block';
        
        try {
            // Get exam details
            const examRef = doc(db, "exams", examId);
            const examSnap = await getDoc(examRef);
            
            if (!examSnap.exists()) {
                alert('Exam not found.');
                return;
            }
            
            const examData = examSnap.data();
            examTitleElement.textContent = examData.title;
            
            // Get exam submissions
            const submissionsQuery = query(collection(db, "submissions"), where("examId", "==", examId));
            const submissionsSnapshot = await getDocs(submissionsQuery);
            
            // Process submissions data
            const submissions = [];
            let totalScore = 0;
            
            submissionsSnapshot.forEach((doc) => {
                const submission = doc.data();
                submissions.push(submission);
                totalScore += submission.score || 0;
            });
            
            // Update summary information
            totalSubmissionsElement.textContent = submissions.length;
            averageScoreElement.textContent = submissions.length > 0 ? (totalScore / submissions.length).toFixed(2) : '0';
            
            // Clear and populate results table
            resultsTableBody.innerHTML = '';
            
            if (submissions.length === 0) {
                resultsTableBody.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-gray-400">No submissions yet.</td></tr>';
                return;
            }
            
            submissions.forEach((submission) => {
                const row = document.createElement('tr');
                row.className = 'border-b border-gray-700 hover:bg-gray-700 transition-colors duration-200';
                row.innerHTML = `
                    <td class="py-3 px-6 text-sm font-medium text-gray-200">${submission.studentName || submission.studentEmail || 'Unknown'}</td>
                    <td class="py-3 px-6 text-sm text-gray-300">${submission.score || 0}</td>
                    <td class="py-3 px-6 text-sm text-gray-300">${examData.questions ? examData.questions.length : 0}</td>
                    <td class="py-3 px-6 text-sm text-gray-300">${new Date(submission.submittedAt.seconds * 1000).toLocaleString()}</td>
                `;
                resultsTableBody.appendChild(row);
            });
            
        } catch (error) {
            console.error('Error loading exam results:', error);
            alert('Error loading exam results: ' + error.message);
        }
    }
    
    // Function to load available exams
    async function loadExams() {
        try {
            const q = query(collection(db, "exams"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            
            exams = [];
            const examSelector = document.getElementById('examSelector');
            
            if (examSelector) {
                examSelector.innerHTML = '<option value="">-- Select an exam --</option>';
                
                querySnapshot.forEach((doc) => {
                    const exam = {
                        id: doc.id,
                        ...doc.data()
                    };
                    exams.push(exam);
                    
                    const option = document.createElement('option');
                    option.value = exam.id;
                    option.textContent = exam.title;
                    if (exam.id === selectedExamId) {
                        option.selected = true;
                    }
                    examSelector.appendChild(option);
                });
                
                // Add event listener to the selector
                examSelector.addEventListener('change', (e) => {
                    selectedExamId = e.target.value;
                    // Update URL without reloading the page
                    const url = new URL(window.location);
                    if (selectedExamId) {
                        url.searchParams.set('examId', selectedExamId);
                    } else {
                        url.searchParams.delete('examId');
                    }
                    window.history.pushState({}, '', url);
                    
                    // Load results for the selected exam
                    loadExamResults(selectedExamId);
                });
            }
            
            // Load results for the initially selected exam
            loadExamResults(selectedExamId);
            
        } catch (error) {
            console.error('Error loading exams:', error);
            alert('Error loading exams: ' + error.message);
        }
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
                // Load available exams
                loadExams();
                console.log('Admin logged in to results page:', user.email);
                // loadExamResults is now called from loadExams function
            } else {
                alert('Access Denied: You are not an administrator.');
                window.location.href = 'home.html';
            }
        } else {
            window.location.href = 'home.html';
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            console.log('User signed out');
            window.location.href = 'home.html';
        } catch (error) {
            console.error('Error signing out:', error.message);
            alert('Error signing out: ' + error.message);
        }
    });

    async function loadExamResults(examId) {
        try {
            console.log('Starting to load exam results for examId:', examId);
            console.log('Current user:', auth.currentUser ? auth.currentUser.uid : 'No user');
            
            // Fetch exam title
            const examDocRef = doc(db, "exams", examId);
            console.log('Attempting to fetch exam document');
            const examDocSnap = await getDoc(examDocRef);

            if (examDocSnap.exists()) {
                console.log('Exam document found:', examDocSnap.data().title);
                examTitleElement.textContent = examDocSnap.data().title;
            } else {
                console.log('Exam document not found');
                examTitleElement.textContent = 'Exam Not Found';
            }

            // Determine if the current user is an admin
            const currentUser = auth.currentUser;
            let isAdmin = false;
            if (currentUser) {
                const userDocRef = doc(db, "users", currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
                    isAdmin = true;
                }
            }

            // Fetch exam results
            console.log('Attempting to fetch exam results');
            console.log('Querying examResults for examId:', examId);
            console.log('Current user UID for query:', auth.currentUser ? auth.currentUser.uid : 'No user UID');

            let q;
            console.log('Is current user an admin?', isAdmin);
            if (isAdmin) {
                // Admins can see all results for the exam
                q = query(collection(db, "examResults"), where("examId", "==", examId));
            } else if (currentUser) {
                // Students can only see their own results for the exam
                q = query(collection(db, "examResults"), 
                          where("examId", "==", examId), 
                          where("userId", "==", currentUser.uid));
            } else {
                // No user logged in, no results to show
                resultsTableBody.innerHTML = '<tr><td colspan="5" class="py-3 px-6 text-center text-gray-400">Please log in to view results.</td></tr>';
                totalSubmissionsElement.textContent = 0;
                averageScoreElement.textContent = 0;
                return;
            }

            try {
                const querySnapshot = await getDocs(q);

                let totalScore = 0;
                let submissionCount = 0;
                resultsTableBody.innerHTML = '';

                if (querySnapshot.empty) {
                    resultsTableBody.innerHTML = '<tr><td colspan="5" class="py-3 px-6 text-center text-gray-400">No results found for this exam yet.</td></tr>';
                    totalSubmissionsElement.textContent = 0;
                    averageScoreElement.textContent = 0;
                    return;
                }

                const userPromises = [];

                querySnapshot.forEach((resultDoc) => {
                    const result = resultDoc.data();
                    totalScore += result.score;
                    submissionCount++;

                    userPromises.push(
                        getDoc(doc(db, "users", result.userId)).then(userSnap => {
                            const userData = userSnap.exists() ? userSnap.data() : { email: 'Unknown User' };
                            const userEmail = userData.email;
                            const userName = userData.name || 'N/A';
                            const row = document.createElement('tr');
                            row.className = 'border-b border-gray-700 hover:bg-gray-700 hover:bg-opacity-30 transition-colors duration-200';
                            row.innerHTML = `
                                <td class="py-3 px-6 text-left whitespace-nowrap">
                                    <div class="flex flex-col">
                                        <span class="font-medium">${userName}</span>
                                        <span class="text-xs text-gray-400">${userEmail}</span>
                                    </div>
                                </td>
                                <td class="py-3 px-6 text-left">${result.score}</td>
                                <td class="py-3 px-6 text-left">${result.totalQuestions}</td>
                                <td class="py-3 px-6 text-left">${new Date(result.submittedAt.toDate()).toLocaleString()}</td>
                                <td class="py-3 px-6 text-left">
                                    <button data-result-id="${resultDoc.id}" class="view-details-btn btn-secondary text-xs py-1 px-3 rounded-md">View Details</button>
                                </td>
                            `;
                            return row;
                        })
                    );
                });

                const rows = await Promise.all(userPromises);
                rows.forEach(row => resultsTableBody.appendChild(row));

                totalSubmissionsElement.textContent = submissionCount;
                averageScoreElement.textContent = (totalScore / submissionCount).toFixed(2);

                // Attach click events to view details buttons
                document.querySelectorAll('.view-details-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const resultId = e.target.dataset.resultId;
                        alert(`View details for result ID: ${resultId} (Functionality to be implemented)`);
                        // window.location.href = `result-details.html?resultId=${resultId}`;
                    });
                });
            } catch (error) {
                console.error('Error loading exam results:', error);
                let errorMessage = 'Failed to load exam results.';
                if (error.code === 'permission-denied') {
                    errorMessage = 'You do not have permission to view these results. Please ensure you are logged in with the correct account.';
                }
                resultsTableBody.innerHTML = `<tr><td colspan="5" class="py-3 px-6 text-center text-red-500">Error: ${errorMessage}</td></tr>`;
            }
        } catch (error) {
            console.error('Error in loadExamResults function:', error);
            resultsTableBody.innerHTML = `<tr><td colspan="5" class="py-3 px-6 text-center text-red-500">An unexpected error occurred: ${error.message}</td></tr>`;
        }
    }
});
