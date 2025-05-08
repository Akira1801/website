class FlashcardSystem {
    constructor() {
        this.categories = [];
        this.currentCategory = null;
        this.currentCardIndex = 0;
        this.editingCardId = null;
        this.currentTestAnswers = [];
        this.isQuizMode = false;
        this.originalFlashcards = [];
        this.init();
        
        // Add CSS for smooth transitions
        const style = document.createElement('style');
        style.textContent = `
            .flashcard {
                transition: height 0.3s ease, font-size 0.3s ease;
            }
            .answer-input {
                transition: font-size 0.3s ease, padding 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }

    init() {
        this.loadFromLocalStorage();
        this.displayCategories();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('answerInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.checkAnswer();
            }
        });
    }

    // Category Management
    showAddCategoryModal() {
        const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
        document.getElementById('categoryName').value = '';
        modal.show();
    }

    addCategory() {
        const categoryName = document.getElementById('categoryName').value.trim();
        if (!categoryName) {
            this.showNotification('Please enter a category name', 'danger');
            return;
        }

        const newCategory = {
            id: Date.now(),
            name: categoryName,
            flashcards: [],
            stats: {
                correct: 0,
                wrong: 0
            }
        };

        this.categories.push(newCategory);
        this.saveToLocalStorage();
        this.displayCategories();
        this.showNotification('Category added successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
    }

    editCategory(categoryId) {
        const category = this.categories.find(c => c.id === categoryId);
        if (!category) return;

        const newName = prompt('Enter new category name:', category.name);
        if (newName && newName.trim()) {
            category.name = newName.trim();
            this.saveToLocalStorage();
            this.displayCategories();
            this.showNotification('Category updated successfully', 'success');
        }
    }

    deleteCategory(categoryId) {
        if (!confirm('Are you sure you want to delete this category and all its flashcards?')) return;

        this.categories = this.categories.filter(c => c.id !== categoryId);
        this.saveToLocalStorage();
        this.displayCategories();
        this.showNotification('Category deleted successfully', 'info');

        if (this.currentCategory && this.currentCategory.id === categoryId) {
            this.hideStudySection();
        }
    }

    // Flashcard Management
    showAddFlashcardModal(edit = false) {
        const modal = new bootstrap.Modal(document.getElementById('flashcardModal'));
        if (!edit) {
            document.getElementById('flashcardFront').value = '';
            document.getElementById('flashcardBack').value = '';
            this.editingCardId = null;
        }
        modal.show();
    }

    editFlashcard(cardId) {
        const card = this.currentCategory.flashcards.find(c => c.id === cardId);
        if (!card) return;

        this.editingCardId = cardId;
        document.getElementById('flashcardFront').value = card.front;
        document.getElementById('flashcardBack').value = card.back;
        this.showAddFlashcardModal(true);
    }

    saveFlashcard() {
        const front = document.getElementById('flashcardFront').value.trim();
        const back = document.getElementById('flashcardBack').value.trim();

        if (!front || !back) {
            this.showNotification('Please fill in both front and back of the flashcard', 'danger');
            return;
        }

        if (this.editingCardId) {
            // Edit existing flashcard
            const card = this.currentCategory.flashcards.find(c => c.id === this.editingCardId);
            if (card) {
                card.front = front;
                card.back = back;
            }
        } else {
            // Add new flashcard
            const newCard = {
                id: Date.now(),
                front: front,
                back: back
            };
            this.currentCategory.flashcards.push(newCard);
        }

        this.saveToLocalStorage();
        this.displayFlashcards();
        this.showNotification('Flashcard saved successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('flashcardModal')).hide();
    }

    deleteFlashcard(cardId) {
        if (!confirm('Are you sure you want to delete this flashcard?')) return;

        this.currentCategory.flashcards = this.currentCategory.flashcards.filter(c => c.id !== cardId);
        this.saveToLocalStorage();
        this.displayFlashcards();
        this.showNotification('Flashcard deleted successfully', 'info');
    }

    // Study Mode
    selectCategory(categoryId) {
        this.currentCategory = this.categories.find(c => c.id === categoryId);
        if (!this.currentCategory) {
            this.showNotification('Category not found', 'danger');
            return;
        }

        // Reset current card index and test answers
        this.currentCardIndex = 0;
        this.currentTestAnswers = [];

        // Show the study section and management section
        const studySection = document.getElementById('studySection');
        const flashcardsManagement = document.getElementById('flashcardsManagement');
        const testHistory = document.getElementById('testHistory');

        studySection.style.display = 'block';
        flashcardsManagement.style.display = 'block';
        testHistory.style.display = 'block';

        // Update the category title
        document.getElementById('currentCategoryTitle').textContent = this.currentCategory.name;

        // Display flashcards and update score
        this.displayFlashcards();
        this.updateScoreDisplay();
        this.showCurrentCard();
        this.displayTestHistory();

        // Show notification
        this.showNotification(`Studying ${this.currentCategory.name}`, 'success');
    }

    displayStudySection() {
        document.getElementById('studySection').style.display = 'block';
        document.getElementById('flashcardsManagement').style.display = 'block';
    }

    hideStudySection() {
        document.getElementById('studySection').style.display = 'none';
        document.getElementById('flashcardsManagement').style.display = 'none';
    }

    flipCard() {
        if (this.isQuizMode) {
            this.showNotification('Card flipping is disabled in Quiz Mode!', 'warning');
            return;
        }
        
        const flashcard = document.querySelector('.flashcard');
        flashcard.classList.toggle('flipped');
    }

    checkAnswer(isQuizMode = false) {
        const inputSelector = isQuizMode ? '#quizModeModal #answerInput' : '#answerInput';
        const input = document.querySelector(inputSelector);
        const answer = input.value.trim().toLowerCase();
        const currentCard = this.currentCategory.flashcards[this.currentCardIndex];
        const correctAnswer = currentCard.back.toLowerCase();

        const isCorrect = answer === correctAnswer;
        
        // Store the answer
        this.currentTestAnswers.push({
            question: currentCard.front,
            correctAnswer: currentCard.back,
            userAnswer: answer,
            isCorrect: isCorrect
        });

        // Update the display
        if (isQuizMode) {
            this.updateQuizScoreDisplay();
        } else {
            this.updateScoreDisplay();
        }
        
        this.showAnswerFeedback(isCorrect, correctAnswer, isQuizMode);
        input.value = '';
        
        // In quiz mode, auto-advance to next card after a brief delay
        if (isQuizMode || this.isQuizMode) {
            setTimeout(() => {
                // Check if we've gone through all cards
                if (this.currentTestAnswers.length >= this.currentCategory.flashcards.length) {
                    this.finishTest(isQuizMode);
                } else {
                    this.nextCard(isQuizMode);
                }
            }, 1500); // 1.5 second delay to see feedback
        }
    }

    showAnswerFeedback(isCorrect, correctAnswer, isQuizMode = false) {
        const feedback = document.createElement('div');
        feedback.className = `answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
        feedback.textContent = isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${correctAnswer}`;

        const cardBodySelector = isQuizMode ? '#quizModeModal .flashcard' : '.flashcard';
        const cardBody = document.querySelector(cardBodySelector).parentElement;
        const existingFeedback = cardBody.querySelector('.answer-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        const inputGroupSelector = isQuizMode ? '#quizModeModal .input-group' : '.input-group';
        cardBody.insertBefore(feedback, document.querySelector(inputGroupSelector));

        setTimeout(() => feedback.remove(), 3000);
    }

    nextCard(isQuizMode = false) {
        if (!this.currentCategory || !this.currentCategory.flashcards.length) return;
        
        this.currentCardIndex = (this.currentCardIndex + 1) % this.currentCategory.flashcards.length;
        
        // In quiz mode, if we've looped back to the beginning and have answers, finish the quiz
        if ((isQuizMode || this.isQuizMode) && this.currentCardIndex === 0 && this.currentTestAnswers.length > 0) {
            this.finishTest(isQuizMode);
            return;
        }
        
        this.showCurrentCard(isQuizMode);
        
        // In quiz mode, focus on the answer input after changing cards
        if (isQuizMode || this.isQuizMode) {
            const inputSelector = isQuizMode ? '#quizModeModal #answerInput' : '#answerInput';
            document.querySelector(inputSelector).focus();
        }
    }

    previousCard() {
        if (!this.currentCategory || !this.currentCategory.flashcards.length) return;
        
        this.currentCardIndex = (this.currentCardIndex - 1 + this.currentCategory.flashcards.length) % this.currentCategory.flashcards.length;
        this.showCurrentCard();
    }

    showCurrentCard(isQuizMode = false) {
        if (!this.currentCategory || !this.currentCategory.flashcards.length) {
            const frontSelector = isQuizMode ? '#quizModeModal #cardFront' : '#cardFront';
            const backSelector = isQuizMode ? '#quizModeModal #cardBack' : '#cardBack';
            document.querySelector(frontSelector).textContent = 'No flashcards in this category';
            document.querySelector(backSelector).textContent = '';
            return;
        }

        const card = this.currentCategory.flashcards[this.currentCardIndex];
        
        const frontSelector = isQuizMode ? '#quizModeModal #cardFront' : '#cardFront';
        const backSelector = isQuizMode ? '#quizModeModal #cardBack' : '#cardBack';
        document.querySelector(frontSelector).textContent = card.front;
        document.querySelector(backSelector).textContent = card.back;

        // Ensure card is showing front side
        const flashcardSelector = isQuizMode ? '#quizModeModal .flashcard' : '.flashcard';
        const flashcard = document.querySelector(flashcardSelector);
        if (flashcard.classList.contains('flipped')) {
            flashcard.classList.remove('flipped');
        }
    }

    // Display Functions
    displayCategories() {
        const categoryList = document.getElementById('categoryList');
        categoryList.innerHTML = '';

        this.categories.forEach(category => {
            const li = document.createElement('li');
            li.className = 'list-group-item category-item';
            li.innerHTML = `
                <div class="w-100">
                    <div class="category-name clickable" onclick="flashcards.selectCategory(${category.id})">
                        ${category.name}
                        <div class="category-stats">
                            Cards: ${category.flashcards.length} | 
                            Correct: ${category.stats.correct} | 
                            Wrong: ${category.stats.wrong}
                        </div>
                    </div>
                </div>
                <div class="category-actions">
                    <button class="btn btn-sm btn-outline-primary clickable" onclick="flashcards.editCategory(${category.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger clickable" onclick="flashcards.deleteCategory(${category.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>`;
            categoryList.appendChild(li);
        });
    }

    displayFlashcards() {
        const container = document.getElementById('flashcardsList');
        container.innerHTML = '';

        if (!this.currentCategory) return;

        this.currentCategory.flashcards.forEach(card => {
            const col = document.createElement('div');
            col.className = 'col-md-4 mb-3';
            col.innerHTML = `
                <div class="flashcard-preview">
                    <h5>Question:</h5>
                    <p>${card.front}</p>
                    <h5>Answer:</h5>
                    <p>${card.back}</p>
                    <div class="d-flex justify-content-end gap-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="flashcards.editFlashcard(${card.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="flashcards.deleteFlashcard(${card.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>`;
            container.appendChild(col);
        });
    }

    updateScoreDisplay() {
        const correct = this.currentTestAnswers.filter(a => a.isCorrect).length;
        const wrong = this.currentTestAnswers.filter(a => !a.isCorrect).length;
        
        document.getElementById('correctScore').textContent = correct;
        document.getElementById('wrongScore').textContent = wrong;
    }

    // Storage Functions
    saveToLocalStorage() {
        localStorage.setItem('flashcards', JSON.stringify(this.categories));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('flashcards');
        this.categories = saved ? JSON.parse(saved) : [];
    }

    // Utility Functions
    showNotification(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast-notification alert alert-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    finishTest(isQuizMode = false) {
        if (this.currentTestAnswers.length === 0) {
            this.showNotification('No answers recorded for this test', 'warning');
            return;
        }

        const correct = this.currentTestAnswers.filter(a => a.isCorrect).length;
        const total = this.currentTestAnswers.length;
        const percentage = Math.round((correct / total) * 100);

        // Create test history entry
        const testEntry = {
            id: Date.now(),
            categoryId: this.currentCategory.id,
            categoryName: this.currentCategory.name,
            date: new Date().toISOString(),
            answers: this.currentTestAnswers,
            correct: correct,
            total: total,
            percentage: percentage
        };

        // Add to category's test history
        if (!this.currentCategory.testHistory) {
            this.currentCategory.testHistory = [];
        }
        this.currentCategory.testHistory.unshift(testEntry);

        // Save and update display
        this.saveToLocalStorage();
        this.displayTestHistory();
        
        // Show completion message
        if (isQuizMode || this.isQuizMode) {
            // Create a result modal inside the quiz modal
            const resultModal = document.createElement('div');
            resultModal.className = 'quiz-result-modal';
            resultModal.innerHTML = `
                <div class="quiz-result-content">
                    <h3>Quiz Completed!</h3>
                    <div class="quiz-result-score">
                        <div class="score-circle">
                            <span class="score-percentage">${percentage}%</span>
                        </div>
                        <div class="score-details">
                            <p>Correct: ${correct} / ${total}</p>
                            <p>Wrong: ${total - correct} / ${total}</p>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-lg mt-4" id="closeQuizBtn">Close Quiz</button>
                </div>
            `;
            
            // Add styles for the result modal
            const style = document.createElement('style');
            style.textContent = `
                .quiz-result-modal {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(255, 255, 255, 0.9);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    animation: fadeIn 0.5s ease;
                }
                
                .quiz-result-content {
                    background-color: white;
                    border-radius: 16px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
                    padding: 2.5rem;
                    text-align: center;
                    max-width: 500px;
                    width: 90%;
                    animation: bounceIn 0.5s ease;
                }
                
                .quiz-result-score {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin: 2rem 0;
                }
                
                .score-circle {
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    background: ${percentage >= 70 ? '#81c784' : percentage >= 40 ? '#ffb74d' : '#e57373'};
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin-right: 2rem;
                }
                
                .score-percentage {
                    font-size: 2.5rem;
                    font-weight: bold;
                    color: white;
                }
                
                .score-details {
                    text-align: left;
                    font-size: 1.2rem;
                }
                
                @keyframes bounceIn {
                    0% { transform: scale(0.8); opacity: 0; }
                    70% { transform: scale(1.05); }
                    100% { transform: scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
            
            // Add the result modal to the quiz modal
            document.getElementById('quizModeModal').appendChild(resultModal);
            
            // Add event listener to close button
            document.getElementById('closeQuizBtn').addEventListener('click', () => {
                this.isQuizMode = false;
                this.currentTestAnswers = []; // Reset current test
                this.updateScoreDisplay();
                
                // Remove the quiz mode modal with animation
                const quizModal = document.getElementById('quizModeModal');
                if (quizModal) {
                    quizModal.style.animation = 'fadeOut 0.3s ease';
                    quizModal.querySelector('.quiz-mode-content').style.animation = 'scaleOut 0.3s ease';
                    
                    setTimeout(() => {
                        quizModal.remove();
                        
                        // Restore original flashcards order
                        this.currentCategory.flashcards = [...this.originalFlashcards];
                        
                        // Reset current card index
                        this.currentCardIndex = 0;
                        this.showCurrentCard();
                        
                        this.showNotification(`Quiz completed! Score: ${percentage}%`, 'success');
                    }, 300);
                }
            });
        } else {
            this.currentTestAnswers = []; // Reset current test
            this.updateScoreDisplay();
            this.showNotification(`Test completed! Score: ${percentage}%`, 'success');
        }
    }

    toggleHistory() {
        const content = document.getElementById('historyContent');
        const icon = document.getElementById('historyToggleIcon');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            icon.classList.add('rotated');
        } else {
            content.style.display = 'none';
            icon.classList.remove('rotated');
        }
    }

    displayTestHistory() {
        const accordion = document.getElementById('testHistoryAccordion');
        accordion.innerHTML = '';

        if (!this.currentCategory || !this.currentCategory.testHistory || this.currentCategory.testHistory.length === 0) {
            accordion.innerHTML = '<div class="no-history">No test history available</div>';
            return;
        }

        this.currentCategory.testHistory.forEach((test, index) => {
            const date = new Date(test.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const item = document.createElement('div');
            item.className = 'test-history-item';
            item.innerHTML = `
                <div class="test-history-header" onclick="flashcards.toggleTestDetails('test${test.id}')">
                    <div>
                        <strong>Test #${this.currentCategory.testHistory.length - index}</strong>
                        <div class="test-date">${date}</div>
                    </div>
                    <div class="test-score">
                        <span class="badge bg-success">Correct: ${test.correct}</span>
                        <span class="badge bg-danger">Wrong: ${test.total - test.correct}</span>
                        <span class="test-percentage">${test.percentage}%</span>
                    </div>
                </div>
                <div class="test-history-content" id="test${test.id}" style="display: none;">
                    <ul class="answer-list">
                        ${test.answers.map(answer => `
                            <li class="${answer.isCorrect ? 'correct' : 'incorrect'}">
                                <div>
                                    <strong>Q: ${answer.question}</strong><br>
                                    <small>Your answer: ${answer.userAnswer}</small><br>
                                    ${!answer.isCorrect ? `<small>Correct answer: ${answer.correctAnswer}</small>` : ''}
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                </div>`;
            accordion.appendChild(item);
        });
    }

    toggleTestDetails(testId) {
        const content = document.getElementById(testId);
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
    }

    toggleQuizMode() {
        if (!this.currentCategory || !this.currentCategory.flashcards.length) {
            this.showNotification('Please select a category with flashcards first', 'warning');
            return;
        }

        this.isQuizMode = !this.isQuizMode;
        
        if (this.isQuizMode) {
            // Create full-screen modal for quiz mode
            const quizModal = document.createElement('div');
            quizModal.id = 'quizModeModal';
            quizModal.className = 'quiz-mode-modal';
            
            // Clone the necessary elements for the quiz
            const studyContent = document.querySelector('.flashcard').closest('.card-body').cloneNode(true);
            
            // Set up the modal content
            quizModal.innerHTML = `
                <div class="quiz-mode-content">
                    <div class="quiz-mode-header">
                        <h3>${this.currentCategory.name} - Quiz Mode</h3>
                        <div class="quiz-score-display">
                            <span class="badge bg-success me-2">Correct: <span id="quizCorrectScore">0</span></span>
                            <span class="badge bg-danger">Wrong: <span id="quizWrongScore">0</span></span>
                            <span class="badge bg-info ms-2">Progress: <span id="quizProgress">0</span>/${this.currentCategory.flashcards.length}</span>
                        </div>
                    </div>
                    <div class="quiz-mode-body"></div>
                </div>
            `;
            
            // Add the study content to the modal body
            quizModal.querySelector('.quiz-mode-body').appendChild(studyContent);
            
            // Add the modal to the body
            document.body.appendChild(quizModal);
            
            // Add CSS for the quiz mode
            const style = document.createElement('style');
            style.textContent = `
                .quiz-mode-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(248, 244, 242, 0.98);
                    z-index: 9999;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    animation: fadeIn 0.3s ease;
                }
                
                .quiz-mode-content {
                    width: 90%;
                    max-width: 800px;
                    background-color: white;
                    border-radius: 16px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
                    padding: 2rem;
                    animation: scaleIn 0.3s ease;
                }
                
                .quiz-mode-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid #e7d4c0;
                }
                
                .quiz-mode-body .flashcard {
                    height: 300px;
                    margin: 2rem 0;
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
                }
                
                .quiz-mode-body .flashcard-front,
                .quiz-mode-body .flashcard-back {
                    font-size: 1.5rem;
                    padding: 2rem;
                }
                
                .quiz-mode-body .input-group {
                    margin: 2rem 0;
                }
                
                .quiz-mode-body .form-control {
                    font-size: 1.2rem;
                    padding: 0.8rem 1.2rem;
                }
                
                .quiz-mode-body .btn {
                    font-size: 1.2rem;
                    padding: 0.8rem 1.5rem;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes scaleIn {
                    from { transform: scale(0.9); }
                    to { transform: scale(1); }
                }
                
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                
                @keyframes scaleOut {
                    from { transform: scale(1); }
                    to { transform: scale(0.9); }
                }
            `;
            document.head.appendChild(style);
            
            // Store original flashcards order
            this.originalFlashcards = [...this.currentCategory.flashcards];
            
            // Randomize flashcards
            this.currentCategory.flashcards = this.shuffleArray([...this.currentCategory.flashcards]);
            
            // Reset current card index and test answers
            this.currentCardIndex = 0;
            this.currentTestAnswers = [];
            
            // Update the quiz mode elements
            this.updateQuizScoreDisplay();
            this.showCurrentCard(true);
            
            // Add event listeners for the quiz mode
            const quizAnswerInput = quizModal.querySelector('#answerInput');
            quizAnswerInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.checkAnswer(true);
                }
            });
            
            quizModal.querySelector('button[onclick="flashcards.checkAnswer()"]').onclick = () => this.checkAnswer(true);
            quizModal.querySelector('button[onclick="flashcards.previousCard()"]').style.display = 'none'; // Hide previous button in quiz mode
            quizModal.querySelector('button[onclick="flashcards.nextCard()"]').onclick = () => this.nextCard(true);
            
            // Focus on the answer input
            quizAnswerInput.focus();
            
            this.showNotification('Quiz Mode activated! Answer all questions to complete the quiz.', 'warning');
        } else {
            // Remove the quiz mode modal with animation
            const quizModal = document.getElementById('quizModeModal');
            if (quizModal) {
                quizModal.style.animation = 'fadeOut 0.3s ease';
                quizModal.querySelector('.quiz-mode-content').style.animation = 'scaleOut 0.3s ease';
                
                setTimeout(() => {
                    quizModal.remove();
                    
                    // Restore original flashcards order
                    this.currentCategory.flashcards = [...this.originalFlashcards];
                    
                    // Reset current card index
                    this.currentCardIndex = 0;
                    this.showCurrentCard();
                    
                    // Update the regular score display
                    this.updateScoreDisplay();
                    
                    this.showNotification('Quiz Mode ended. Returned to Study Mode.', 'success');
                }, 300);
            }
        }
    }

    updateQuizScoreDisplay() {
        const correct = this.currentTestAnswers.filter(a => a.isCorrect).length;
        const wrong = this.currentTestAnswers.filter(a => !a.isCorrect).length;
        
        document.getElementById('quizCorrectScore').textContent = correct;
        document.getElementById('quizWrongScore').textContent = wrong;
        document.getElementById('quizProgress').textContent = this.currentTestAnswers.length;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

const flashcards = new FlashcardSystem(); 