const pdfFiles = [
    { filename: "HSK1_Полный_словарь_2026.pdf", level: 1 },
    // { filename: "ваш_файл.pdf", level: 2 },
    // { filename: "ещё_один.pdf", level: 3 },
];


const levelNames = {
    0: "其他 / Другое",
    1: "HSK 1",
    2: "HSK 2",
    3: "HSK 3",
    4: "HSK 4",
    5: "HSK 5",
    6: "HSK 6"
};

let currentFilter = "all";

document.addEventListener("DOMContentLoaded", () => {
    renderCards();
    initFilters();
    setTimeout(() => {
        hideLoader();
    }, 500);
});

function hideLoader() {
    const loader = document.getElementById("loader");
    if (loader) {
        loader.classList.add("hidden");
        setTimeout(() => {
            loader.style.display = "none";
        }, 300);
    }
}

function renderCards() {
    const grid = document.getElementById("cardsGrid");
    const emptyState = document.getElementById("emptyState");
    
    const filteredFiles = currentFilter === "all" 
        ? pdfFiles 
        : pdfFiles.filter(file => file.level === parseInt(currentFilter));
    
    if (filteredFiles.length === 0) {
        grid.innerHTML = "";
        emptyState.style.display = "block";
        return;
    }
    
    emptyState.style.display = "none";
    
    grid.innerHTML = filteredFiles.map((file, index) => createCardHTML(file, index)).join("");
    
    filteredFiles.forEach((file, index) => {
        renderPdfCover(file.filename, index);
    });
}

function createCardHTML(file, index) {
    const level = file.level || 0;
    const title = generateTitleFromFilename(file.filename);
    const fileUrl = `pdf/${encodeURIComponent(file.filename)}`;
    
    return `
        <div class="pdf-card" data-level="${level}">
            <div class="card-cover" id="cover-${index}">
                <div class="cover-level">${levelNames[level]}</div>
                <div class="cover-placeholder">📄</div>
            </div>
            <div class="card-info">
                <h3 class="card-title">${escapeHtml(title)}</h3>
                <div class="card-actions">
                    <a href="${fileUrl}" 
                       class="action-btn btn-download" 
                       download="${file.filename}"
                       title="Скачать: ${escapeHtml(title)}">
                        <span class="icon">⬇</span>
                        <span>下载</span>
                    </a>
                    <button class="action-btn btn-copy" 
                            data-url="${fileUrl}"
                            title="Копировать ссылку">
                        <span class="icon">🔗</span>
                        <span>复制</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function renderPdfCover(filename, cardIndex) {
    const coverContainer = document.getElementById(`cover-${cardIndex}`);
    if (!coverContainer) return;
    
    const filePath = `pdf/${encodeURIComponent(filename)}`;
    
    try {
        const loadingTask = pdfjsLib.getDocument(filePath);
        const pdf = await loadingTask.promise;
        
        const page = await pdf.getPage(1);
        
        const scale = 1.5;
        const viewport = page.getViewport({ scale: scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        const placeholder = coverContainer.querySelector('.cover-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        coverContainer.appendChild(canvas);
        
    } catch (error) {
        console.log(`Не удалось загрузить обложку для ${filename}:`, error.message);
    }
}

function generateTitleFromFilename(filename) {
    let title = filename.replace(/\.pdf$/i, '');
    title = title.replace(/[_-]/g, ' ');
    title = title.replace(/\s+/g, ' ').trim();
    if (title.length > 0) {
        title = title.charAt(0).toUpperCase() + title.slice(1);
    }
    return title || filename;
}

function initFilters() {
    const buttons = document.querySelectorAll(".filter-btn");
    
    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.level;
            renderCards();
        });
    });
    
    document.addEventListener("click", async (e) => {
        const copyBtn = e.target.closest(".btn-copy");
        if (copyBtn) {
            await copyLinkToClipboard(copyBtn);
        }
    });
}

async function copyLinkToClipboard(button) {
    const relativeUrl = button.dataset.url;
    const fullUrl = window.location.href.replace(/index\.html?$/, '') + relativeUrl;
    const prettyFullUrl = decodeURIComponent(fullUrl);
    
    try {
        await navigator.clipboard.writeText(prettyFullUrl);
        
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="icon">✓</span><span>已复制</span>';
        button.classList.add("copied");
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove("copied");
        }, 2000);
        
    } catch (error) {
        const textArea = document.createElement("textarea");
        textArea.value = prettyFullUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        
        button.innerHTML = '<span class="icon">✓</span><span>已复制</span>';
        button.classList.add("copied");
        
        setTimeout(() => {
            button.innerHTML = '<span class="icon">🔗</span><span>复制</span>';
            button.classList.remove("copied");
        }, 2000);
    }
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
