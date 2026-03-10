// ── 書架 Grid 管理 ─────────────────────────────────────

// 讀取目前--col-count
function getColCount(container) {
  return (
    parseInt(getComputedStyle(container).getPropertyValue("--col-count")) || 6
  );
}

// 更新書架底板的 grid-row 定位
function updateShelfGrid(container) {
  const shelfItems = container.querySelectorAll(".bookshelf-bottom-item");
  shelfItems.forEach((item, i) => {
    const shelfIndex = i + 1;
    const shelfRow = shelfIndex * 2;
    item.style.gridRow = shelfRow;
  });
}

// 生成或更新 bookshelf-bottom-item
function syncShelfItems(container) {
  const colCount = getColCount(container);
  const bookItems = container.querySelectorAll(".book-item");
  const rowCount = Math.ceil(bookItems.length / colCount);
  const existing = container.querySelectorAll(".bookshelf-bottom-item");
  const difference = rowCount - existing.length;
  if (difference > 0) {
    // 不夠，補增
    for (let i = 0; i < difference; i++) {
      const el = document.createElement("div");
      el.className = "bookshelf-bottom-item";
      container.appendChild(el);
    }
  } else if (difference < 0) {
    // 太多，刪除多餘的（從最後開始刪）
    for (let i = 0; i < Math.abs(difference); i++) {
      const last = container.querySelector(".bookshelf-bottom-item:last-child");
      if (last) last.remove();
    }
  }
}

// 重新計算整個 shelf grid
function recalculateShelfGrid(container) {
  syncShelfItems(container);
  updateShelfGrid(container);
}

// ── API 設定 ───────────────────────────────────────────

// 測試用 API
const API_URL =
  "http://127.0.0.1:3658/m1/1222159-1218189-default/api/libraryBook/getBookList";

// ── 元素引用 ───────────────────────────────────────────

const $loadMoreBtn = document.getElementById("load-more-book");
const $loadMoreContainer = document.querySelector(".load-more-container");
const $bookContainer = document.querySelector(".book-grid-container");

// ── 進行中的請求控制器（對應舊版 currentXHR）─────────────

let currentController = null;

// ── 抓取經書資料 ───────────────────────────────────────

async function fetchBooks(offset) {
  // 若有進行中的請求，先取消
  if (currentController) {
    currentController.abort();
    currentController = null;
  }

  setLoadingState(true);

  const params = new URLSearchParams({ offset });

  currentController = new AbortController();

  try {
    const res = await fetch(`${API_URL}?${params}`, {
      signal: currentController.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const response = await res.json();
    currentController = null;
    handleSuccess(response);
  } catch (error) {
    if (error.name === "AbortError") return;
    currentController = null;
    handleError(error);
  } finally {
    if (currentController === null) setLoadingState(false);
  }
}

// 成功處理
function handleSuccess(response) {
  if (response.status && response.list && response.list.length > 0) {
    renderBooks(response.list);
    updateLoadMoreButton(
      response.offset + response.list.length,
      response.hasMore,
    );
  }
}

// 失敗處理
function handleError(error) {
  console.error("載入書本失敗:", error);
}

// Loading 狀態
function setLoadingState(loading) {
  if (!$loadMoreBtn) return;
  $loadMoreBtn.disabled = loading;
  const icon = $loadMoreBtn.querySelector("i");
  if (icon) icon.classList.toggle("fa-spin", loading);
}

// 更新載入更多按鈕
function updateLoadMoreButton(nextOffset, hasMore) {
  if (!$loadMoreBtn || !$loadMoreContainer) return;
  $loadMoreBtn.dataset.offset = nextOffset;
  const display = hasMore ? "" : "none";
  $loadMoreContainer.style.display = $loadMoreBtn.style.display = display;
}

// 渲染書本列表(Handlebars 模板引擎編譯)
function renderBooks(list) {
  if (!$bookContainer) return;
  const templateSrc = document.getElementById("book-item-template").innerHTML;
  const templateFn = Handlebars.compile(templateSrc);
  const html = templateFn({ books: list });
  $bookContainer.insertAdjacentHTML("beforeend", html);
  recalculateShelfGrid($bookContainer);
}

// RWD：視窗大小改變時重新計算
let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if ($bookContainer) recalculateShelfGrid($bookContainer);
  }, 150);
});

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  // 初始載入
  fetchBooks(0);
  // 載入更多
  if ($loadMoreBtn) {
    $loadMoreBtn.addEventListener("click", function () {
      const offset = parseInt(this.dataset.offset, 10) || 0;
      fetchBooks(offset);
    });
  }
});
