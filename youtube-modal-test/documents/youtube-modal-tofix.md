# YouTube Modal — 待修正問題清單

## 問題總覽

| 編號 | 問題 | 等級 |
|------|------|------|
| 1 | `document.addEventListener` 無 `disconnectedCallback` 清除，Memory Leak | 🔴 高 |
| 2 | `close()` / `isOpen()` 無 null check，可能 crash | 🔴 高 |
| 3 | `#loadLiteYoutube()` 裡 11 行 commented dead code | 🟠 中 |
| 4 | `<template id="youtube-iframe-template">` 及 `iframeTemplate` 從未被使用 | 🟠 中 |
| 5 | `this.pendingVideoId` 定義後從未使用 | 🟠 中 |
| 6 | `this.player` 定義、賦值、但從未讀取，無功能意義 | 🟠 中 |
| 7 | `setInterval + setTimeout` polling 邏輯複製兩份 | 🟠 中 |
| 8 | `iframeContainer.innerHTML = ''` 重複執行兩次 | 🟠 中 |
| 9 | `#updateBodyVisibility()` 在單次 `open()` 中被呼叫最多兩次 | 🟠 中 |
| 10 | `params` 字串在每次 `open()` 重新計算 | 🟡 低 |
| 11 | `liteYoutubeCSS` 快取用字串 key 間接存取，不一致 | 🟡 低 |
| 12 | double `requestAnimationFrame` 多餘，增加 ~32ms 啟動延遲 | 🟡 低 |
| 13 | JS 與 CSS 兩個 CDN 請求可以並行改為 `Promise.all` | 🟡 低 |

---

## 🔴 高優先（Bug 等級）

### 問題 1 — Memory Leak：`document.addEventListener` 無清除機制

**位置**：`youtube-modal-component.js` → `#initEventListeners()`

```javascript
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && this.isOpen()) {
        this.close();
    }
});
```

**問題說明**：  
整個 class 沒有 `disconnectedCallback`。這個監聽器掛在 `document` 上，元件從 DOM 移除後不會自動清除。若元件被重新 mount（SPA 場景或頁面切換），監聽器會重複累積，造成 Memory Leak。

**修正方向**：  
在 constructor 將 handler 儲存為 bound method，並實作 `disconnectedCallback` 做清除。

```javascript
constructor() {
    // ...
    this._keydownHandler = (e) => {
        if (e.key === 'Escape' && this.isOpen()) this.close();
    };
}

#initEventListeners() {
    // ...
    document.addEventListener('keydown', this._keydownHandler);
}

disconnectedCallback() {
    document.removeEventListener('keydown', this._keydownHandler);
}
```

---

### 問題 2 — Null Safety：`close()` 和 `isOpen()` 無防護

**位置**：`youtube-modal-component.js` → `close()`、`isOpen()`

```javascript
close() {
    this.elements.modal.classList.remove('active'); // ← 無 null check
}

isOpen() {
    return this.elements.modal.classList.contains('active'); // ← 無 null check
}
```

**問題說明**：  
若 `connectedCallback` 尚未完成（`#render()` 還在執行），外部就呼叫 `close()` 或 `isOpen()`，或在 `open()` 的 `catch` 區塊裡觸發 `this.close()`，都會直接 throw 錯誤。ESC keydown handler 裡呼叫了 `this.isOpen()`，是已存在的潛在 crash 路徑。

**修正方向**：  
加上 null check 防護。

```javascript
close() {
    if (!this.elements.modal) return;
    this.elements.modal.classList.remove('active');
    // ...
}

isOpen() {
    return this.elements.modal?.classList.contains('active') ?? false;
}
```

---

## 🟠 中優先（程式碼品質問題）

### 問題 3 — Dead Code：11 行被 comment 掉的 CSS loading

**位置**：`youtube-modal-component.js` → `#loadLiteYoutube()`（第 69–85 行）

```javascript
// 載入 CSS
// const cssLink = document.createElement('link');
// cssLink.rel = 'stylesheet';
// cssLink.href = 'https://cdnjs.cloudflare.com/...';
// cssLink.integrity = '...';
// cssLink.crossOrigin = 'anonymous';
// cssLink.referrerPolicy = 'no-referrer';
// ...
// const existingCSS = document.querySelector(`link[href="${cssLink.href}"]`);
// if (!existingCSS) {
//     document.head.appendChild(cssLink);
// }
```

**問題說明**：  
這段已被 `#loadLiteYoutubeCSS()` 的 `fetch` 方案取代，保留只是干擾閱讀，應直接刪除。

---

### 問題 4 — Dead Code：`youtube-iframe-template` 及 `iframeTemplate` 從未被使用

**位置 1**：`youtube-modal-template.js`（第 35–37 行）

```html
<template id="youtube-iframe-template">
  <iframe></iframe>
</template>
```

**位置 2**：`youtube-modal-component.js` → `#initElements()`

```javascript
iframeTemplate: root.querySelector('#youtube-iframe-template')
```

**問題說明**：  
播放器已改用 `lite-youtube` 直接 `createElement` 建立，這個 template 完全是殘留的死碼。`this.elements.iframeTemplate` 在整個 class 裡沒有任何地方讀取或使用。

**修正方向**：  
刪除 template.js 裡的 `<template id="youtube-iframe-template">` 區塊，以及 `#initElements()` 裡的 `iframeTemplate` 那一行。

---

### 問題 5 — Dead Code：`this.pendingVideoId` 從未使用

**位置**：`youtube-modal-component.js` → `constructor()`

```javascript
this.pendingVideoId = null;
```

**問題說明**：  
constructor 裡設置後，整個 class 再也沒有被讀取或賦值，推測是早期版本的遺留屬性。

**修正方向**：  
直接刪除。

---

### 問題 6 — Dead Code：`this.player` 無實際讀取用途

**位置**：`youtube-modal-component.js`

```javascript
// constructor
this.player = null;

// #createLiteYoutube()
this.player = el;

// close()
this.player = null;
```

**問題說明**：  
三處操作 `this.player`，但從未被讀取。停止播放的邏輯靠 `iframeContainer.innerHTML = ''` 完成，`this.player` 沒有實際用途。

**修正方向**：  
若未來有明確用途（例如直接控制播放器 API）再保留，否則刪除這三處。

---

### 問題 7 — 重複邏輯：`setInterval + setTimeout` polling 複製兩份

**位置**：`youtube-modal-component.js` → `#loadLiteYoutube()`（第 90–116 行）

`existingScript` 分支和 `script.onload` 分支中，各自有一份完全相同的 polling 邏輯：

```javascript
const checkInterval = setInterval(() => {
    if (customElements.get('lite-youtube')) {
        clearInterval(checkInterval);
        resolve();
    }
}, 50);
setTimeout(() => {
    clearInterval(checkInterval);
    if (!customElements.get('lite-youtube')) {
        reject(new Error('lite-youtube-embed 載入超時'));
    }
}, 5000);
```

**修正方向**：  
抽成一個 helper function 供兩個分支共用。

```javascript
function waitForCustomElement(name, resolve, reject, timeout = 5000) {
    const checkInterval = setInterval(() => {
        if (customElements.get(name)) {
            clearInterval(checkInterval);
            resolve();
        }
    }, 50);
    setTimeout(() => {
        clearInterval(checkInterval);
        if (!customElements.get(name)) {
            reject(new Error(`${name} 載入超時`));
        }
    }, timeout);
}
```

---

### 問題 8 — 重複清空：`iframeContainer.innerHTML = ''` 執行兩次

**位置**：`youtube-modal-component.js`

```javascript
// open() 裡
if (iframeContainer) iframeContainer.innerHTML = '';

// 接著呼叫 #createLiteYoutube()，裡面又清空一次
iframeContainer.innerHTML = '';
```

**修正方向**：  
刪除 `open()` 裡那一行，由 `#createLiteYoutube()` 統一負責清空。

---

PS:0226修改到這裡
### 問題 9 — 重複呼叫：`#updateBodyVisibility()` 在單次 `open()` 最多觸發兩次

**位置**：`youtube-modal-component.js` → `#renderRelatedVideos()` 及 `open()`

`#renderRelatedVideos()` 內部在三個 return 路徑上各自呼叫了 `#updateBodyVisibility()`，而 `open()` 在呼叫 `#renderRelatedVideos()` 後又再呼叫一次，導致最多執行兩次不必要的 DOM 讀寫。

**修正方向**：  
讓 `#renderRelatedVideos()` 不在內部呼叫 `#updateBodyVisibility()`，改由 `open()` 統一在所有內容更新完畢後呼叫一次。

---

## 🟡 低優先（效能 / 風格優化）

### 問題 10 — `params` 字串每次 `open()` 重新計算

**位置**：`youtube-modal-component.js` → `#createLiteYoutube()`

```javascript
const params = new URLSearchParams(YoutubeModal.PLAYER_VARS).toString();
```

**問題說明**：  
`PLAYER_VARS` 是靜態常數，結果永遠不會變，卻在每次建立播放器時都重新運算。

**修正方向**：  
作為 static 屬性預先計算一次。

```javascript
static _cachedParams = new URLSearchParams(YoutubeModal.PLAYER_VARS).toString();
```

---

### 問題 11 — `liteYoutubeCSS` 快取存取方式不一致

**位置**：`youtube-modal-component.js` → `#loadLiteYoutubeCSS()`

```javascript
const cacheKey = 'liteYoutubeCSS';
if (YoutubeModal[cacheKey]) { ... }
YoutubeModal[cacheKey] = cssText;
```

**問題說明**：  
class 頂部已宣告 `static liteYoutubeCSS = null;`，但這裡卻用字串 key 間接存取同一個屬性，造成閱讀混亂。

**修正方向**：  
直接使用 `YoutubeModal.liteYoutubeCSS`。

---

### 問題 12 — double `requestAnimationFrame` 多餘

**位置**：`youtube-modal-component.js` → `#render()`

```javascript
await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
```

**問題說明**：  
`shadowRoot.innerHTML = '...'` 是同步操作，設置完成後 DOM 元素立即可被 `querySelector` 存取。後續 `#initElements()` 只做 querySelector，不需要等待渲染幀。此 double rAF 增加約 **32ms** 的無謂啟動延遲。

**修正方向**：  
直接刪除，`#render()` 不需要 `await` 任何 rAF。

---

### 問題 13 — JS 與 CSS 的 CDN 請求可以並行

**位置**：`youtube-modal-component.js` → `connectedCallback()`

```javascript
await this.#loadLiteYoutube();  // 等 JS 載入完
await this.#render();           // 裡面才 fetch CSS
```

**問題說明**：  
`#loadLiteYoutubeCSS()` 與 `#loadLiteYoutube()` 互不相依，目前卻是序列執行。

**修正方向**：  
改用 `Promise.all` 並行執行，縮短總初始化時間。

```javascript
async connectedCallback() {
    // ...
    const [, css, liteYoutubeCSS] = await Promise.all([
        this.#loadLiteYoutube(),
        this.#loadCSS(),
        this.#loadLiteYoutubeCSS()
    ]);
    await this.#render(css, liteYoutubeCSS);
    // ...
}
```

