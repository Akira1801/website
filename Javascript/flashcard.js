class FlashcardSystem {
    constructor() {
        this.categories = [];
        this.currentCategory = null;
        this.currentCardIndex = 0;
        this.editingCardId = null;
        this.currentTestAnswers = [];
        this.init();
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
        const flashcard = document.querySelector('.flashcard');
        flashcard.classList.toggle('flipped');
    }

    checkAnswer() {
        const input = document.getElementById('answerInput');
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
        this.updateScoreDisplay();
        this.showAnswerFeedback(isCorrect, correctAnswer);
        input.value = '';
    }

    showAnswerFeedback(isCorrect, correctAnswer) {
        const feedback = document.createElement('div');
        feedback.className = `answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
        feedback.textContent = isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${correctAnswer}`;

        const cardBody = document.querySelector('.flashcard').parentElement;
        const existingFeedback = cardBody.querySelector('.answer-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        cardBody.insertBefore(feedback, document.querySelector('.input-group'));

        setTimeout(() => feedback.remove(), 3000);
    }

    nextCard() {
        if (!this.currentCategory || !this.currentCategory.flashcards.length) return;
        
        this.currentCardIndex = (this.currentCardIndex + 1) % this.currentCategory.flashcards.length;
        this.showCurrentCard();
    }

    previousCard() {
        if (!this.currentCategory || !this.currentCategory.flashcards.length) return;
        
        this.currentCardIndex = (this.currentCardIndex - 1 + this.currentCategory.flashcards.length) % this.currentCategory.flashcards.length;
        this.showCurrentCard();
    }

    showCurrentCard() {
        if (!this.currentCategory || !this.currentCategory.flashcards.length) {
            document.getElementById('cardFront').textContent = 'No flashcards in this category';
            document.getElementById('cardBack').textContent = '';
            return;
        }

        const card = this.currentCategory.flashcards[this.currentCardIndex];
        document.getElementById('cardFront').textContent = card.front;
        document.getElementById('cardBack').textContent = card.back;

        // Ensure card is showing front side
        const flashcard = document.querySelector('.flashcard');
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

    finishTest() {
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
        this.currentTestAnswers = []; // Reset current test
        this.updateScoreDisplay();

        this.showNotification(`Test completed! Score: ${percentage}%`, 'success');
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
}

const flashcards = new FlashcardSystem(); 