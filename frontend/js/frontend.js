/* =========================
   Common
========================= */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDiaryDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

/* =========================
   login.html
========================= */
function toggleForm(type) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (!loginForm || !signupForm) {
        return;
    }

    if (type === 'signup') {
        loginForm.classList.add('hidden-form');
        signupForm.classList.remove('hidden-form');
    } else {
        signupForm.classList.add('hidden-form');
        loginForm.classList.remove('hidden-form');
    }
}

/* =========================
   ai-persona.html
========================= */
function addPersona() {
    const nameInput = document.getElementById('persona-name');
    const summaryInput = document.getElementById('persona-summary');
    const toneInput = document.getElementById('persona-tone');
    const styleInput = document.getElementById('persona-style');
    const expressionInput = document.getElementById('persona-expression');
    const personaList = document.getElementById('persona-list');

    if (!nameInput || !summaryInput || !toneInput || !styleInput || !expressionInput || !personaList) {
        return;
    }

    const name = nameInput.value.trim();
    const summary = summaryInput.value.trim();
    const tone = toneInput.value.trim();
    const style = styleInput.value.trim();
    const expression = expressionInput.value.trim();

    if (!name || !summary || !tone || !style || !expression) {
        alert('紐⑤뱺 ??ぉ???낅젰?댁＜?몄슂.');
        return;
    }

    const emptyBox = personaList.querySelector('.persona-empty');
    if (emptyBox) {
        emptyBox.remove();
    }

    const card = document.createElement('div');
    card.className = 'persona-card';

    card.innerHTML = `
        <div class="persona-card-header">
            <div>
                <div class="persona-card-title">${escapeHtml(name)}</div>
                <div class="persona-card-summary">${escapeHtml(summary)}</div>
            </div>
            <button type="button" class="persona-delete-btn" onclick="deletePersona(this)">??젣</button>
        </div>

        <div class="mb-4">
            <span class="persona-badge">Persona</span>
        </div>

        <div class="persona-meta">
            <div class="persona-meta-item">
                <span class="persona-meta-label">留먰닾 / 遺꾩쐞湲?/span>
                <div class="persona-meta-value">${escapeHtml(tone)}</div>
            </div>

            <div class="persona-meta-item">
                <span class="persona-meta-label">AI 諛섏쓳 ?ㅽ???/span>
                <div class="persona-meta-value">${escapeHtml(style).replace(/\n/g, '<br>')}</div>
            </div>

            <div class="persona-meta-item">
                <span class="persona-meta-label">?먯＜ ?곕뒗 ?쒗쁽</span>
                <div class="persona-meta-value">${escapeHtml(expression).replace(/\n/g, '<br>')}</div>
            </div>
        </div>
    `;

    personaList.prepend(card);

    nameInput.value = '';
    summaryInput.value = '';
    toneInput.value = '';
    styleInput.value = '';
    expressionInput.value = '';
}

function deletePersona(button) {
    const card = button.closest('.persona-card');
    const personaList = document.getElementById('persona-list');

    if (!card || !personaList) {
        return;
    }

    card.remove();

    const cards = personaList.querySelectorAll('.persona-card');
    if (cards.length === 0) {
        personaList.innerHTML = `
            <div class="persona-empty">
                ?꾩쭅 留뚮뱺 ?섎Ⅴ?뚮굹媛 ?놁뼱??<br>
                ?쇱そ?먯꽌 泥?踰덉㎏ ?섎Ⅴ?뚮굹瑜?留뚮뱾?대낫?몄슂.
            </div>
        `;
    }
}

/* =========================
   my-diary.html
========================= */
let diaryShelfIndex = 0;

function openDiaryModal() {
    const modal = document.getElementById('diary-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
}

function closeDiaryModal() {
    const modal = document.getElementById('diary-modal');
    if (!modal) return;
    modal.classList.add('hidden');
}

function openSearchModal() {
    const modal = document.getElementById('search-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
}

function closeSearchModal() {
    const modal = document.getElementById('search-modal');
    if (!modal) return;
    modal.classList.add('hidden');
}

function saveDiaryEntry() {
    const dateInput = document.getElementById('diary-date');
    const titleInput = document.getElementById('diary-title');
    const contentInput = document.getElementById('diary-content');
    const shelf = document.getElementById('diary-shelf');
    const emptyState = document.getElementById('diary-empty-state');

    if (!dateInput || !titleInput || !contentInput || !shelf) return;

    const date = dateInput.value.trim();
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!date || !title || !content) {
        alert('?좎쭨, ?쒕ぉ, ?쇨린 ?댁슜??紐⑤몢 ?낅젰?댁＜?몄슂.');
        return;
    }

    if (emptyState) {
        emptyState.remove();
    }

    const book = document.createElement('div');
    book.className = 'diary-book';

    book.innerHTML = `
        <div class="diary-book-inner">
            <div class="diary-book-date">${escapeHtml(formatDiaryDate(date))}</div>
            <div class="diary-book-title">${escapeHtml(title)}</div>

            <div class="diary-book-footer">
                <button type="button" class="diary-book-delete" onclick="deleteDiaryBook(this)">??젣</button>
            </div>
        </div>
    `;

    shelf.prepend(book);

    dateInput.value = '';
    titleInput.value = '';
    contentInput.value = '';

    diaryShelfIndex = 0;
    updateDiaryShelfPosition();
    renderDiaryProgress();
    closeDiaryModal();
}

function deleteDiaryBook(button) {
    if (!confirm('??젣 ?섏떆寃좎뒿?덇퉴?')) {
        return;
    }

    const book = button.closest('.diary-book');
    const shelf = document.getElementById('diary-shelf');

    if (!book || !shelf) return;

    book.remove();

    const remainingBooks = shelf.querySelectorAll('.diary-book');
    if (remainingBooks.length === 0) {
        shelf.innerHTML = `
            <div class="diary-empty-book" id="diary-empty-state">
                ?꾩쭅 ??λ맂 ?쇨린媛 ?놁뼱??<br>
                泥?踰덉㎏ ?섎（瑜?梨낆쑝濡?留뚮뱾?대낫?몄슂.
            </div>
        `;
        diaryShelfIndex = 0;
    } else {
        const maxIndex = Math.max(0, remainingBooks.length - 1);
        if (diaryShelfIndex > maxIndex) {
            diaryShelfIndex = maxIndex;
        }
    }

    updateDiaryShelfPosition();
    renderDiaryProgress();
}

function moveDiaryShelf(direction) {
    const shelf = document.getElementById('diary-shelf');
    if (!shelf) return;

    const books = shelf.querySelectorAll('.diary-book');
    if (!books.length) return;

    const maxIndex = Math.max(0, books.length - 1);
    diaryShelfIndex += direction;

    if (diaryShelfIndex < 0) diaryShelfIndex = 0;
    if (diaryShelfIndex > maxIndex) diaryShelfIndex = maxIndex;

    updateDiaryShelfPosition();
    renderDiaryProgress();
}

function updateDiaryShelfPosition() {
    const shelf = document.getElementById('diary-shelf');
    if (!shelf) return;

    const isMobile = window.innerWidth <= 768;
    const step = isMobile ? 90 : 106;
    const offset = diaryShelfIndex * step;

    shelf.style.transform = `translateX(-${offset}px)`;
}

function renderDiaryProgress() {
    const progress = document.getElementById('diary-progress');
    const shelf = document.getElementById('diary-shelf');

    if (!progress || !shelf) return;

    const books = shelf.querySelectorAll('.diary-book');
    progress.innerHTML = '';

    if (!books.length) {
        for (let i = 0; i < 18; i++) {
            const dot = document.createElement('span');
            dot.className = 'diary-progress-dot';
            progress.appendChild(dot);
        }
        return;
    }

    books.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.className = 'diary-progress-dot';

        if (index === diaryShelfIndex) {
            dot.classList.add('active');
        }

        progress.appendChild(dot);
    });
}

function fakeDiarySearch() {
    const input = document.getElementById('diary-search-input');
    const result = document.getElementById('diary-search-result');

    if (!input || !result) return;

    const keyword = input.value.trim();

    if (!keyword) {
        alert('寃?됲븯怨??띠? ?댁슜???낅젰?댁＜?몄슂.');
        return;
    }

    result.innerHTML = `
        "${escapeHtml(keyword)}" ? 愿?⑤맂 ?쇨린瑜?李얜뒗 AI 寃??湲곕뒫???ㅼ뼱媛??먮━?덉슂.<br>
        吏湲덉? UI留?留뚮뱺 ?곹깭?닿퀬, ?섏쨷??鍮꾩듂???쇨린 ?댁슜?대굹 ?대떦 ?좎쭨瑜?李얠븘二쇰뒗 湲곕뒫?쇰줈 ?곌껐?섎㈃ ?쇱슂.
    `;
}

/* =========================
   diary_detail.html
========================= */
/* 현재 diary_detail.html 전용 스크립트는 없습니다. */

/* =========================
   my-diary.html Events
========================= */
window.addEventListener('resize', () => {
    updateDiaryShelfPosition();
    renderDiaryProgress();
});

window.addEventListener('DOMContentLoaded', () => {
    const shelfWrapper = document.querySelector('.diary-shelf-wrapper');

    if (shelfWrapper) {
        shelfWrapper.addEventListener('wheel', (event) => {
            const shelf = document.getElementById('diary-shelf');
            if (!shelf) return;

            const books = shelf.querySelectorAll('.diary-book');
            if (!books.length) return;

            event.preventDefault();

            if (event.deltaY > 0) {
                moveDiaryShelf(1);
            } else {
                moveDiaryShelf(-1);
            }
        }, { passive: false });
    }

    renderDiaryProgress();
});
