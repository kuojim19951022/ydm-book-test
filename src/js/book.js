// ── 書架 Grid 管理 ─────────────────────────────────────

/**
 * 讀取 CSS 目前的 --col-count（會隨 RWD 媒體查詢變化）
 */
function getColCount(container) {
    return parseInt(
        getComputedStyle(container).getPropertyValue('--col-count')
    ) || 6;
}

/**
 * 更新書架底板的 grid-row 定位
 * 每個 bookshelf-bottom-item 指定到對應的 shelf-row
 */
function updateShelfGrid(container) {
    const shelfItems  = container.querySelectorAll('.bookshelf-bottom-item');
    shelfItems.forEach((item, i) => {
        const shelfRow = (i + 1) * 2 + 1; // i=0 → 3, i=1 → 5, i=2 → 7 ...
        item.style.gridRow = shelfRow;
    });
}

/**
 * 生成或更新 bookshelf-bottom-item 數量
 */
function syncShelfItems(container) {
    const colCount   = getColCount(container);
    const bookItems  = container.querySelectorAll('.book-item');
    const rowCount   = Math.ceil(bookItems.length / colCount);

    const existing   = container.querySelectorAll('.bookshelf-bottom-item');
    const diff       = rowCount - existing.length;

    if (diff > 0) {
        // 不夠，補增
        for (let i = 0; i < diff; i++) {
            const el = document.createElement('div');
            el.className = 'bookshelf-bottom-item';
            container.appendChild(el);
        }
    } else if (diff < 0) {
        // 太多，刪除多餘的（從最後開始刪）
        for (let i = 0; i < Math.abs(diff); i++) {
            const last = container.querySelector('.bookshelf-bottom-item:last-child');
            if (last) last.remove();
        }
    }
}

/**
 * 重新計算整個 shelf grid
 * （syncShelfItems + updateShelfGrid 合在一起）
 */
function recalculateShelfGrid(container) {
    syncShelfItems(container);
    updateShelfGrid(container);
}

// ── 書本列表載入 ───────────────────────────────────────

async function loadBookList() {
    try {
        const response = await fetch('../data/book-list.json');
        if (!response.ok) throw new Error('無法載入書本資料');

        const books          = await response.json();
        const container      = document.querySelector('.book-grid-container');
        const templateSource = document.getElementById('book-item-template').innerHTML;

        if (!container || !templateSource) {
            console.error('找不到容器或模板');
            return;
        }

        // 編譯並渲染 Handlebars 模板
        const template = Handlebars.compile(templateSource);
        const html     = template({ books });
        container.insertAdjacentHTML('beforeend', html);

        // 書本載入完成後，計算 shelf-items 並定位
        recalculateShelfGrid(container);

        console.log(`成功載入 ${books.length} 本書，共 ${Math.ceil(books.length / getColCount(container))} 列`);
    } catch (error) {
        console.error('載入書本列表時發生錯誤:', error);
    }
}

// ── RWD：視窗大小改變時重新計算 ────────────────────────

let resizeTimer = null;

window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        const container = document.querySelector('.book-grid-container');
        if (container) recalculateShelfGrid(container);
    }, 150); // debounce 150ms
});

// ── 初始化 ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', loadBookList);
