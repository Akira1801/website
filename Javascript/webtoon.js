class WebtoonLibrary {
    constructor() {
        this.currentPage = 1;
        this.isLoading = false;
        this.init();
    }

    init() {
        this.loadLibrary();
        this.setupEventListeners();
        this.setupInfiniteScroll();
    }

    setupEventListeners() {
        document.getElementById('searchInput').addEventListener('input', debounce(() => this.searchWebtoons(), 500));
        document.getElementById('typeFilter').addEventListener('change', () => this.searchWebtoons());
        
        // Add sort functionality
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.sortLibrary(e.target.value);
        });
    }

    setupInfiniteScroll() {
        window.addEventListener('scroll', () => {
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
                if (!this.isLoading) {
                    this.currentPage++;
                    this.searchWebtoons(true);
                }
            }
        });
    }

    async searchWebtoons(append = false) {
        if (this.isLoading) return;
        
        const query = document.getElementById('searchInput').value;
        const type = document.getElementById('typeFilter').value;
        
        if (!append) {
            this.currentPage = 1;
            document.getElementById('results').innerHTML = '';
        }

        if (query.length < 3) return;

        this.toggleLoading(true);
        
        try {
            const url = `https://api.jikan.moe/v4/manga?q=${query}&page=${this.currentPage}&limit=12${type ? `&type=${type}` : ''}`;
            const response = await fetch(url);
            const data = await response.json();
            
            this.displayResults(data.data, append);
        } catch (error) {
            this.showNotification('Error fetching data. Please try again.', 'error');
            console.error('Error:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    displayResults(items, append = false) {
        const resultsDiv = document.getElementById('results');
        
        if (!append) {
            resultsDiv.innerHTML = '';
        }

        if (items.length === 0 && !append) {
            resultsDiv.innerHTML = '<div class="empty-state">No results found</div>';
            return;
        }

        items.forEach(item => {
            const card = this.createWebtoonCard(item);
            resultsDiv.appendChild(card);
        });
    }

    createWebtoonCard(item) {
        const card = document.createElement('div');
        card.className = 'col-md-3 mb-4';
        
        const rating = item.score ? this.generateRatingStars(item.score) : 'No rating';
        
        card.innerHTML = `
            <div class="card h-100">
                <img src="${item.images.jpg.image_url}" class="card-img-top" alt="${item.title}" loading="lazy">
                <div class="card-body">
                    <h5 class="card-title">${item.title}</h5>
                    <div class="rating-stars mb-2">${rating}</div>
                    <p class="card-text">${item.synopsis ? item.synopsis.substring(0, 100) + "..." : "No description available."}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <a href="${item.url}" target="_blank" class="btn btn-primary btn-sm">View More</a>
                        <div class="dropdown">
                            <button class="btn btn-success btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                Add to List
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="library.addToLibrary('${item.mal_id}', '${item.title.replace(/'/g, "\\'")}', 'reading')">Reading</a></li>
                                <li><a class="dropdown-item" href="#" onclick="library.addToLibrary('${item.mal_id}', '${item.title.replace(/'/g, "\\'")}', 'completed')">Completed</a></li>
                                <li><a class="dropdown-item" href="#" onclick="library.addToLibrary('${item.mal_id}', '${item.title.replace(/'/g, "\\'")}', 'dropped')">Dropped</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>`;
        
        return card;
    }

    generateRatingStars(score) {
        const fullStars = Math.floor(score / 2);
        const hasHalfStar = score % 2 >= 1;
        let stars = '';
        
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars += '★';
            } else if (i === fullStars && hasHalfStar) {
                stars += '½';
            } else {
                stars += '☆';
            }
        }
        
        return `${stars} (${score})`;
    }

    addToLibrary(id, title, category = 'reading') {
        if (document.querySelector(`[data-id='${id}']`)) {
            this.showNotification('This title is already in your library!', 'warning');
            return;
        }

        const libraryItem = document.createElement('li');
        libraryItem.className = 'list-group-item d-flex justify-content-between align-items-center';
        libraryItem.dataset.id = id;
        
        libraryItem.innerHTML = `
            <span>${title}</span>
            <div class="d-flex align-items-center">
                <span class="status-badge status-${category} me-2">${category}</span>
                <select class="form-select form-select-sm w-auto" onchange="library.moveToCategory(this, '${id}', '${title}', '${category}')">
                    <option value="reading" ${category === 'reading' ? 'selected' : ''}>Reading</option>
                    <option value="completed" ${category === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="dropped" ${category === 'dropped' ? 'selected' : ''}>Dropped</option>
                </select>
                <button class="btn btn-danger btn-sm ms-2" onclick="library.removeFromLibrary('${id}')">×</button>
            </div>`;

        document.getElementById(`${category}List`).appendChild(libraryItem);
        this.saveLibrary();
        this.showNotification('Added to your library!', 'success');
    }

    removeFromLibrary(id) {
        const item = document.querySelector(`[data-id='${id}']`);
        if (item) {
            item.remove();
            this.saveLibrary();
            this.showNotification('Removed from your library', 'info');
        }
    }

    moveToCategory(element, id, title, category) {
        // If called from select element, get the value
        if (element.tagName === 'SELECT') {
            category = element.value;
        }
        
        this.removeFromLibrary(id);
        this.addToLibrary(id, title, category);
    }

    sortLibrary(sortType) {
        ['reading', 'completed', 'dropped'].forEach(category => {
            const list = document.getElementById(`${category}List`);
            const items = Array.from(list.children);
            
            items.sort((a, b) => {
                const textA = a.querySelector('span').textContent.toLowerCase();
                const textB = b.querySelector('span').textContent.toLowerCase();
                return sortType === 'asc' ? textA.localeCompare(textB) : textB.localeCompare(textA);
            });
            
            list.innerHTML = '';
            items.forEach(item => list.appendChild(item));
        });
    }

    saveLibrary() {
        const library = {
            reading: [],
            completed: [],
            dropped: []
        };

        ['reading', 'completed', 'dropped'].forEach(category => {
            library[category] = Array.from(document.getElementById(`${category}List`).children).map(item => ({
                id: item.dataset.id,
                title: item.querySelector('span').textContent
            }));
        });

        localStorage.setItem('webtoonLibrary', JSON.stringify(library));
    }

    loadLibrary() {
        const library = JSON.parse(localStorage.getItem('webtoonLibrary'));
        if (!library) return;

        ['reading', 'completed', 'dropped'].forEach(category => {
            const list = document.getElementById(`${category}List`);
            list.innerHTML = '';
            library[category].forEach(webtoon => {
                this.addToLibrary(webtoon.id, webtoon.title, category);
            });
        });
    }

    toggleLoading(show) {
        this.isLoading = show;
        document.querySelector('.loading-spinner').style.display = show ? 'block' : 'none';
    }

    showNotification(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast-notification alert alert-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const library = new WebtoonLibrary(); 