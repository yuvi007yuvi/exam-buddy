import { auth, db } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/9.8.0/firebase-firestore.js";

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

    let examData = null;
    let questions = [];

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
            alert(`Exam submitted! Your score: ${score}/${questions.length}`);
            window.location.href = 'student.html'; // Redirect to student dashboard after submission
        } catch (error) {
            console.error('Error submitting exam:', error);
            alert('Error submitting exam: ' + error.message);
        }
    });
});