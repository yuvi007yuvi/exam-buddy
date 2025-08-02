import { auth, db, analytics } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.8.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, orderBy, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.8.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
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

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Check user role
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
                console.log('Admin logged in:', user.email);
                const userNameDisplay = document.getElementById('userNameDisplay');
        const navUserNameDisplay = document.getElementById('navUserNameDisplay');
        if (userNameDisplay) {
            userNameDisplay.textContent = user.displayName || user.email;
        }
        if (navUserNameDisplay) {
            navUserNameDisplay.textContent = user.displayName || user.email;
        }
                initializeAdminDashboard();
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

    function initializeAdminDashboard() {
        const createExamForm = document.getElementById('createExamForm');
        const addQuestionBtn = document.getElementById('addQuestionBtn');
        const questionsContainer = document.getElementById('questionsContainer');
        let questionCount = 0;

        const uploadMcqForm = document.getElementById('uploadMcqForm');
        const mcqExamIdSelect = document.getElementById('mcqExamId');
        const addMcqQuestionBtn = document.getElementById('addMcqQuestionBtn');
        const mcqQuestionsInput = document.getElementById('mcqQuestionsInput');
        let mcqQuestionCounter = 0;
        
        // Results modal elements
        const viewResultsBtn = document.getElementById('viewResultsBtn');
        const resultsModal = document.getElementById('resultsModal');
        const closeResultsModalBtn = document.getElementById('closeResultsModalBtn');
        const resultsExamSelect = document.getElementById('resultsExamSelect');
        const viewSelectedExamResultsBtn = document.getElementById('viewSelectedExamResultsBtn');

        // Function to add a new MCQ question block
        function addMcqQuestionBlock() {
            mcqQuestionCounter++;
            const questionDiv = document.createElement('div');
            questionDiv.className = 'mcq-question-block glass-card p-4 mb-4';
            questionDiv.innerHTML = `
                <h4 class="text-lg font-semibold mb-2">Question ${mcqQuestionCounter}</h4>
                <div>
                    <label for="mcqQuestionText${mcqQuestionCounter}" class="block text-sm font-medium text-gray-400">Question Text</label>
                    <input type="text" id="mcqQuestionText${mcqQuestionCounter}" name="mcqQuestionText${mcqQuestionCounter}" required
                           class="mt-1 block w-full px-4 py-3 bg-opacity-20 bg-gray-800 border-0 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent sm:text-sm text-white">
                </div>
                <div>
                    <label for="mcqOptionA${mcqQuestionCounter}" class="block text-sm font-medium text-gray-400">Option A</label>
                    <input type="text" id="mcqOptionA${mcqQuestionCounter}" name="mcqOptionA${mcqQuestionCounter}" required
                           class="mt-1 block w-full px-4 py-3 bg-opacity-20 bg-gray-800 border-0 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent sm:text-sm text-white">
                </div>
                <div>
                    <label for="mcqOptionB${mcqQuestionCounter}" class="block text-sm font-medium text-gray-400">Option B</label>
                    <input type="text" id="mcqOptionB${mcqQuestionCounter}" name="mcqOptionB${mcqQuestionCounter}" required
                           class="mt-1 block w-full px-4 py-3 bg-opacity-20 bg-gray-800 border-0 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent sm:text-sm text-white">
                </div>
                <div>
                    <label for="mcqOptionC${mcqQuestionCounter}" class="block text-sm font-medium text-gray-400">Option C</label>
                    <input type="text" id="mcqOptionC${mcqQuestionCounter}" name="mcqOptionC${mcqQuestionCounter}" required
                           class="mt-1 block w-full px-4 py-3 bg-opacity-20 bg-gray-800 border-0 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent sm:text-sm text-white">
                </div>
                <div>
                    <label for="mcqOptionD${mcqQuestionCounter}" class="block text-sm font-medium text-gray-400">Option D</label>
                    <input type="text" id="mcqOptionD${mcqQuestionCounter}" name="mcqOptionD${mcqQuestionCounter}" required
                           class="mt-1 block w-full px-4 py-3 bg-opacity-20 bg-gray-800 border-0 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent sm:text-sm text-white">
                </div>
                <div>
                    <label for="mcqCorrectAnswer${mcqQuestionCounter}" class="block text-sm font-medium text-gray-400">Correct Answer (e.g., A, B, C, D)</label>
                    <input type="text" id="mcqCorrectAnswer${mcqQuestionCounter}" name="mcqCorrectAnswer${mcqQuestionCounter}" required
                           class="mt-1 block w-full px-4 py-3 bg-opacity-20 bg-gray-800 border-0 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent sm:text-sm text-white">
                </div>
            `;
            mcqQuestionsInput.appendChild(questionDiv);
        }

        // Initial add of one MCQ question block
        addMcqQuestionBlock();

        addQuestionBtn.addEventListener('click', () => {
            questionCount++;
            const questionDiv = document.createElement('div');
            questionDiv.className = 'glass-card p-4 mb-4';
            questionDiv.innerHTML = `
                <h4 class="font-semibold text-gray-400 mb-2">Question ${questionCount}</h4>
                <div>
                    <label for="questionText${questionCount}" class="block text-sm font-medium text-gray-400">Question Text</label>
                    <input type="text" id="questionText${questionCount}" name="questionText${questionCount}" required
                           class="mt-1 block w-full px-4 py-3 bg-opacity-20 bg-gray-800 border-0 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent sm:text-sm text-white">
                </div>
                <div class="mt-2 space-y-2">
                    <label class="block text-sm font-medium text-gray-400">Options:</label>
                    <input type="text" name="option${questionCount}_1" placeholder="Option 1" required class="mt-1 block w-full px-4 py-3 bg-opacity-20 bg-gray-800 border-0 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent sm:text-sm text-white">
                    <input type="text" name="option${questionCount}_2" placeholder="Option 2" required class="mt-1 block w-full px-4 py-3 bg-opacity-20 bg-gray-800 border-0 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent sm:text-sm text-white">
                    <input type="text" name="option${questionCount}_3" placeholder="Option 3" required class="mt-1 block w-full px-4 py-3 bg-opacity-20 bg-gray-800 border-0 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent sm:text-sm text-white">
                    <input type="text" name="option${questionCount}_4" placeholder="Option 4" required class="mt-1 block w-full px-4 py-3 bg-opacity-20 bg-gray-800 border-0 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent sm:text-sm text-white">
                </div>
                <div class="mt-2">
                    <label for="correctAnswer${questionCount}" class="block text-sm font-medium text-gray-400">Correct Option (1-4)</label>
                    <input type="number" id="correctAnswer${questionCount}" name="correctAnswer${questionCount}" min="1" max="4" required
                           class="mt-1 block w-full px-4 py-3 bg-opacity-20 bg-gray-800 border-0 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent sm:text-sm text-white">
                </div>
            `;
            questionsContainer.appendChild(questionDiv);
        });

        addMcqQuestionBtn.addEventListener('click', addMcqQuestionBlock);

        createExamForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const examTitle = document.getElementById('examTitle').value;
            const examDescription = document.getElementById('examDescription').value;
            const timeLimit = parseInt(document.getElementById('timeLimit').value);

            const questions = [];
            for (let i = 1; i <= questionCount; i++) {
                const questionText = document.getElementById(`questionText${i}`).value;
                const options = [
                    createExamForm.elements[`option${i}_1`].value,
                    createExamForm.elements[`option${i}_2`].value,
                    createExamForm.elements[`option${i}_3`].value,
                    createExamForm.elements[`option${i}_4`].value
                ];
                const correctAnswer = parseInt(createExamForm.elements[`correctAnswer${i}`].value);

                questions.push({
                    questionText,
                    options,
                    correctAnswer: correctAnswer - 1 // 0-indexed
                });
            }

            try {
                await addDoc(collection(db, "exams"), {
                    title: examTitle,
                    description: examDescription,
                    timeLimit: timeLimit,
                    questions: questions,
                    createdAt: new Date(),
                    createdBy: auth.currentUser.uid
                });
                alert('Exam created successfully!');
                createExamForm.reset();
                questionsContainer.innerHTML = '';
                questionCount = 0;
                loadExams(); // Reload exams list
                populateMcqExamSelect(); // Reload MCQ exam select
            } catch (error) {
                console.error('Error creating exam:', error);
                alert('Error creating exam: ' + error.message);
            }
        });

        // Excel Upload Functionality
        const excelUploadInput = document.getElementById('excelUpload');
        const uploadExcelBtn = document.getElementById('uploadExcelBtn');
        const downloadSampleExcelBtn = document.getElementById('downloadSampleExcel');

        downloadSampleExcelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const ws_data = [
                ["Question Text", "Option A", "Option B", "Option C", "Option D", "Correct Answer (A,B,C,D)"],
                ["What is 2+2?", "3", "4", "5", "6", "B"],
                ["Which planet is known as the Red Planet?", "Earth", "Mars", "Jupiter", "Venus", "B"]
            ];
            const ws = XLSX.utils.aoa_to_sheet(ws_data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Questions");
            XLSX.writeFile(wb, "Sample_Exam_Questions.xlsx");
        });

        uploadExcelBtn.addEventListener('click', () => {
            const examId = mcqExamIdSelect.value;
            if (!examId) {
                alert('Please select an exam to upload questions to.');
                return;
            }

            const file = excelUploadInput.files[0];
            if (!file) {
                alert('Please select an Excel file to upload.');
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                const newMcqQuestions = [];
                for (const row of json) {
                    const questionText = row["Question Text"];
                    const optionA = row["Option A"];
                    const optionB = row["Option B"];
                    const optionC = row["Option C"];
                    const optionD = row["Option D"];
                    const correctAnswerChar = String(row["Correct Answer (A,B,C,D)"]).toUpperCase();

                    if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswerChar) {
                        alert('Invalid Excel format. Please ensure all columns (Question Text, Option A, B, C, D, Correct Answer) are present and filled for all rows.');
                        return;
                    }

                    const options = [optionA, optionB, optionC, optionD];
                    let correctAnswerIndex;
                    switch (correctAnswerChar) {
                        case 'A': correctAnswerIndex = 0; break;
                        case 'B': correctAnswerIndex = 1; break;
                        case 'C': correctAnswerIndex = 2; break;
                        case 'D': correctAnswerIndex = 3; break;
                        default:
                            alert(`Invalid correct answer '${correctAnswerChar}' found in Excel. Please use A, B, C, or D.`);
                            return;
                    }

                    newMcqQuestions.push({
                        questionText,
                        options,
                        correctAnswer: correctAnswerIndex
                    });
                }

                if (newMcqQuestions.length === 0) {
                    alert('No valid questions found in the Excel file.');
                    return;
                }

                try {
                    const examRef = doc(db, "exams", examId);
                    const examSnap = await getDoc(examRef);

                    if (examSnap.exists()) {
                        const existingQuestions = examSnap.data().questions || [];
                        const updatedQuestions = [...existingQuestions, ...newMcqQuestions];

                        await updateDoc(examRef, {
                            questions: updatedQuestions
                        });
                        alert('MCQ questions from Excel uploaded successfully!');
                        excelUploadInput.value = ''; // Clear the file input
                    } else {
                        alert('Selected exam not found.');
                    }
                } catch (error) {
                    console.error('Error uploading MCQ questions from Excel:', error);
                    alert('Error uploading MCQ questions from Excel: ' + error.message);
                }
            };
            reader.readAsArrayBuffer(file);
        });

        uploadMcqForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const examId = mcqExamIdSelect.value;
            if (!examId) {
                alert('Please select an exam.');
                return;
            }

            const newMcqQuestions = [];
            for (let i = 1; i <= mcqQuestionCounter; i++) {
                const questionText = document.getElementById(`mcqQuestionText${i}`).value;
                const options = [
                    document.getElementById(`mcqOptionA${i}`).value,
                    document.getElementById(`mcqOptionB${i}`).value,
                    document.getElementById(`mcqOptionC${i}`).value,
                    document.getElementById(`mcqOptionD${i}`).value
                ];
                const correctAnswerChar = document.getElementById(`mcqCorrectAnswer${i}`).value.toUpperCase();
                let correctAnswerIndex;
                switch (correctAnswerChar) {
                    case 'A': correctAnswerIndex = 0; break;
                    case 'B': correctAnswerIndex = 1; break;
                    case 'C': correctAnswerIndex = 2; break;
                    case 'D': correctAnswerIndex = 3; break;
                    default: 
                        alert(`Invalid correct answer for Question ${i}. Please use A, B, C, or D.`);
                        return;
                }

                newMcqQuestions.push({
                    questionText,
                    options,
                    correctAnswer: correctAnswerIndex
                });
            }

            try {
                const examRef = doc(db, "exams", examId);
                const examSnap = await getDoc(examRef);
                
                if (examSnap.exists()) {
                    const existingQuestions = examSnap.data().questions || [];
                    const updatedQuestions = [...existingQuestions, ...newMcqQuestions];

                    await updateDoc(examRef, {
                        questions: updatedQuestions
                    });
                    alert('MCQ questions uploaded successfully!');
                    uploadMcqForm.reset();
                    mcqQuestionsInput.innerHTML = '';
                    mcqQuestionCounter = 0;
                    addMcqQuestionBlock(); // Add initial empty block
                } else {
                    alert('Selected exam not found.');
                }
            } catch (error) {
                console.error('Error uploading MCQ questions:', error);
                alert('Error uploading MCQ questions: ' + error.message);
            }
        });

        loadExams();
        populateMcqExamSelect();
        
        // Results modal functionality
        viewResultsBtn.addEventListener('click', () => {
            populateResultsExamSelect();
            resultsModal.classList.remove('hidden');
        });
        
        closeResultsModalBtn.addEventListener('click', () => {
            resultsModal.classList.add('hidden');
        });
        
        viewSelectedExamResultsBtn.addEventListener('click', () => {
            const selectedExamId = resultsExamSelect.value;
            if (!selectedExamId) {
                alert('Please select an exam to view results.');
                return;
            }
            window.location.href = `results.html?examId=${selectedExamId}`;
        });

        async function populateMcqExamSelect() {
            mcqExamIdSelect.innerHTML = '<option value="">-- Select an existing exam --</option>';
            try {
                const q = query(collection(db, "exams"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => {
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = doc.data().title;
                    mcqExamIdSelect.appendChild(option);
                });
            } catch (error) {
                console.error('Error populating exam select:', error);
            }
        }

        async function populateResultsExamSelect() {
            resultsExamSelect.innerHTML = '<option value="">-- Select an exam --</option>';
            try {
                const q = query(collection(db, "exams"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                
                if (querySnapshot.empty) {
                    resultsExamSelect.innerHTML += '<option disabled>No exams available</option>';
                    return;
                }
                
                querySnapshot.forEach((doc) => {
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = doc.data().title;
                    resultsExamSelect.appendChild(option);
                });
            } catch (error) {
                console.error('Error populating results exam select:', error);
                alert('Error loading exams: ' + error.message);
            }
        }
        
        async function loadExams() {
            const examsList = document.getElementById('examsList');
            examsList.innerHTML = ''; // Clear current list

            try {
                const q = query(collection(db, "exams"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    examsList.innerHTML = '<p class="text-gray-400">No exams created yet.</p>';
                    return;
                }

                const table = document.createElement('table');
                table.className = 'min-w-full bg-gray-800 rounded-lg overflow-hidden shadow-lg';
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th class="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Title</th>
                            <th class="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                            <th class="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Time Limit</th>
                            <th class="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="examsTableBody"></tbody>
                `;
                examsList.appendChild(table);

                const examsTableBody = document.getElementById('examsTableBody');

                querySnapshot.forEach((doc) => {
                    const exam = doc.data();
                    const examId = doc.id;
                    const row = document.createElement('tr');
                    row.className = 'border-b border-gray-700 hover:bg-gray-700 transition-colors duration-200';
                    row.innerHTML = `
                        <td class="py-3 px-4 text-sm font-medium text-gray-200">${exam.title}</td>
                        <td class="py-3 px-4 text-sm text-gray-300">${exam.description}</td>
                        <td class="py-3 px-4 text-sm text-gray-300">${exam.timeLimit} mins</td>
                        <td class="py-3 px-4 text-sm">
                            <button class="btn-secondary py-1 px-3 text-xs rounded view-exam-btn" data-id="${examId}"><i class="fas fa-eye mr-1"></i>View</button>
                            <button class="btn-danger py-1 px-3 text-xs rounded delete-exam-btn ml-2" data-id="${examId}"><i class="fas fa-trash-alt mr-1"></i>Delete</button>
                        </td>
                    `;
                    examsTableBody.appendChild(row);
                });

                // Add event listeners for view and delete buttons
                document.querySelectorAll('.view-exam-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const examId = e.currentTarget.dataset.id;
                        // Redirect to exam page with the exam ID
                        window.location.href = `exam.html?examId=${examId}`;
                    });
                });

                document.querySelectorAll('.delete-exam-btn').forEach(button => {
                    button.addEventListener('click', async (e) => {
                        const examId = e.target.dataset.id;
                        if (confirm('Are you sure you want to delete this exam?')) {
                            try {
                                await deleteDoc(doc(db, "exams", examId));
                                alert('Exam deleted successfully!');
                                loadExams(); // Reload the list
                            } catch (error) {
                                console.error('Error deleting exam:', error);
                                alert('Error deleting exam: ' + error.message);
                            }
                        }
                    });
                });

            } catch (error) {
                console.error('Error loading exams:', error);
                alert('Error loading exams: ' + error.message);
            }
        }
    }
});