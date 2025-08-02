import { auth, db } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/9.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.8.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', async () => {
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
    const urlParams = new URLSearchParams(window.location.search);
    const examId = urlParams.get('examId');

    if (!examId) {
        alert('Exam ID not found.');
        window.location.href = 'student.html';
        return;
    }

    const examTitleElement = document.getElementById('examTitle');
    const examDescriptionElement = document.getElementById('examDescription');
    const questionsContainer = document.getElementById('questionsContainer');
    const submitExamBtn = document.getElementById('submitExamBtn');
    const studentNameElement = document.getElementById('studentName');

    let examData = null;
    let questions = [];
    let warningCount = 0; // To track how many times the user has switched tabs
    let examSubmitted = false; // Flag to indicate if the exam has been submitted

    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
        if (user) {
            studentNameElement.textContent = `Student: ${user.displayName || user.email}`;
        } else {
            // User is signed out
            window.location.href = 'index.html'; // Redirect to login
        }
    });

    // Tab switching warning
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && !examSubmitted) {
            warningCount++;
            if (warningCount <= 2) {
                alert(`Warning! You switched tabs. This is attempt #${warningCount}. Excessive switching may lead to disqualification.`);
            } else if (warningCount === 3) {
                alert('You have switched tabs too many times. Your exam will be submitted automatically.');
                submitExamBtn.click(); // Auto-submit the exam
            }
        }
    });



    try {
        // Fetch exam details
        const examDocRef = doc(db, "exams", examId);
        const examDocSnap = await getDoc(examDocRef);

        if (!examDocSnap.exists()) {
            alert('Exam not found.');
            window.location.href = 'student.html';
            return;
        }

        examData = examDocSnap.data();
        examTitleElement.textContent = examData.title;
        examDescriptionElement.textContent = examData.description;

        // Questions are stored directly in the exam document
        questions = examData.questions || [];

        if (questions.length === 0) {
            questionsContainer.innerHTML = '<p class="text-gray-400 text-center py-8">No questions found for this exam.</p>';
            submitExamBtn.style.display = 'none';
            return;
        }

        displayQuestions();

        // Timer functionality
        const examTimerElement = document.getElementById('examTimer');
        let timeLeft = examData.timeLimit * 60; // Convert minutes to seconds

        const timerInterval = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            let seconds = timeLeft % 60;

            seconds = seconds < 10 ? '0' + seconds : seconds;

            examTimerElement.textContent = `Time Left: ${minutes}:${seconds}`;

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                alert('Time is up! Your exam will be submitted automatically.');
                submitExamBtn.click(); // Programmatically click the submit button
            }

            timeLeft--;
        }, 1000);

    } catch (error) {
        console.error('Error loading exam:', error);
        alert('Error loading exam. Please try again later.');
        window.location.href = 'student.html';
    }

    function displayQuestions() {
        questionsContainer.innerHTML = '';
        questions.forEach((question, index) => {
            const questionElement = document.createElement('div');
            questionElement.className = 'bg-opacity-20 bg-gray-800 p-6 rounded-lg shadow-md mb-6 border border-gray-700';
            let optionsHtml = '';
            question.options.forEach((option, optionIndex) => {
                optionsHtml += `
                    <label class="inline-flex items-center mt-3 cursor-pointer w-full p-2 hover:bg-gray-700 hover:bg-opacity-30 rounded-lg transition-colors duration-200">
                        <input type="radio" class="form-radio h-5 w-5 text-blue-400" name="question-${index}" value="${option}">
                        <span class="ml-2 text-gray-300">${option}</span>
                    </label><br>
                `;
            });
            questionElement.innerHTML = `
                <p class="text-lg font-semibold mb-4 text-white">${index + 1}. ${question.questionText}</p>
                <div class="pl-4">${optionsHtml}</div>
            `;
            questionsContainer.appendChild(questionElement);
        });
    }

    submitExamBtn.addEventListener('click', async () => {
        let score = 0;
        const userAnswers = {};

        questions.forEach((question, index) => {
            const selectedOption = document.querySelector(`input[name="question-${index}"]:checked`);
            if (selectedOption) {
                userAnswers[index] = selectedOption.value;
                // Assuming question.correctAnswer is the 0-indexed correct option
                // And question.options is an array of options
                if (selectedOption.value === question.options[question.correctAnswer]) {
                    score++;
                }
            }
        });

        try {
            await addDoc(collection(db, "examResults"), {
                examId: examId,
                userId: auth.currentUser.uid,
                score: score,
                totalQuestions: questions.length,
                userAnswers: userAnswers,
                submittedAt: new Date()
            });
            examSubmitted = true; // Set flag to true on successful submission
            // Display results on the exam page
            const resultDisplay = document.createElement('div');
            resultDisplay.className = 'bg-green-800 bg-opacity-50 p-6 rounded-lg shadow-md mt-8 text-center';
            resultDisplay.innerHTML = `
                <h2 class="text-2xl font-bold text-white mb-4">Exam Submitted!</h2>
                <p class="text-xl text-white">Your Score: ${score} / ${questions.length}</p>
                <button id="backToDashboardBtn" class="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Back to Dashboard</button>
            `;
            questionsContainer.innerHTML = ''; // Clear questions
            questionsContainer.appendChild(resultDisplay);
            submitExamBtn.style.display = 'none'; // Hide submit button

            document.getElementById('backToDashboardBtn').addEventListener('click', () => {
                window.location.href = 'student.html';
            });

            // Disable all radio buttons after submission
            const radioButtons = document.querySelectorAll('input[type="radio"]');
            radioButtons.forEach(radio => radio.disabled = true);
        } catch (error) {
            console.error('Error submitting exam:', error);
            alert('Error submitting exam: ' + error.message);
        }
    });
});