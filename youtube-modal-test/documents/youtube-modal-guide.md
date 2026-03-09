# YouTube Modal Web Component 使用手冊

## 目錄

- [基本用法](#基本用法)
- [API Endpoint 設定](#api-endpoint-設定)
- [開啟彈窗](#開啟彈窗)
- [功能開關設定](#功能開關設定)
- [API 回應格式](#api-回應格式)
- [程式碼結構說明](#程式碼結構說明)
- [注意事項](#注意事項)

---

## 基本用法

### 1. 在 HTML 中放入元件

```html
<youtube-modal endpoint="/path/to/getVideoDetail"></youtube-modal>
```

### 2. 載入元件腳本

```html
<script type="module" src="/path/to/youtube-modal/js/youtube-modal-component.js"></script>
```

**注意**：請將 `/path/to/youtube-modal` 替換為實際的元件安裝路徑。

---

## API Endpoint 設定

元件需要透過 API endpoint 取得影片詳細資料。設定方式有兩種：

### 方式 1：HTML 屬性（推薦）

直接在元件標籤中設定：

```html
<youtube-modal endpoint="/path/to/getVideoDetail"></youtube-modal>
```

### 方式 2：全域變數（跨頁共用）

```html
<script>
  window.YOUTUBE_MODAL_ENDPOINT = '/path/to/getVideoDetail';
</script>
<youtube-modal></youtube-modal>
```

### 優先順序

1. HTML 屬性 `endpoint`（最高優先）
2. 全域變數 `window.YOUTUBE_MODAL_ENDPOINT`

**重要**：如果都不設定，元件無法載入影片資料。

---

## 開啟彈窗

### JavaScript 呼叫方式

```javascript
// 取得元件實例
const modal = document.querySelector('youtube-modal');

// 開啟彈窗（傳入影片 ID）
modal.open('video-id-123');
```

### 完整範例

```html
<!-- HTML -->
<youtube-modal endpoint="/path/to/getVideoDetail"></youtube-modal>

<div class="video-item" data-id="video-001">
  <img src="cover.jpg" alt="影片標題">
  <h3>影片標題</h3>
</div>

<script type="module" src="/path/to/youtube-modal/js/youtube-modal-component.js"></script>
<script>
  // 點擊影片項目開啟彈窗
  document.querySelector('.video-item').addEventListener('click', function() {
    const videoId = this.dataset.id;
    const modal = document.querySelector('youtube-modal');
    modal.open(videoId);
  });
</script>
```

### 可用方法

| 方法 | 說明 | 參數 |
|------|------|------|
| `open(videoId)` | 開啟彈窗並載入影片 | `videoId`：影片 ID（必填） |
| `close()` | 關閉彈窗 | 無 |
| `isOpen()` | 檢查彈窗是否開啟 | 無，返回 `boolean` |

---

## 功能開關設定

### 在 JavaScript 設定檔中設定

編輯 `youtube-modal-component.js` 中的 `CONFIG`：

```javascript
static CONFIG = {
    SHOW_TITLE: true,              // 是否顯示標題
    SHOW_DESCRIPTION: true,         // 是否顯示描述
    SHOW_RELATED_DEFAULT: true      // 是否預設顯示相關影片
};
```

### 在 HTML 標籤中設定

```html
<!-- 關閉相關影片 -->
<youtube-modal 
  endpoint="/path/to/getVideoDetail"
  show-related="false">
</youtube-modal>
```

### 功能說明

- **`SHOW_TITLE`**：控制是否顯示影片標題（預設：`true`）
- **`SHOW_DESCRIPTION`**：控制是否顯示影片描述（預設：`true`）
  - 如果描述為空，會自動隱藏
- **`SHOW_RELATED_DEFAULT`**：控制是否預設顯示相關影片（預設：`true`）
  - 可透過 HTML 屬性 `show-related` 覆蓋

### 自動隱藏邏輯

- **描述區塊**：如果描述為空或 `SHOW_DESCRIPTION` 為 `false`，會自動隱藏
- **相關影片區塊**：如果沒有相關影片或 `show-related="false"`，會自動隱藏
- **Body 區塊**：如果描述和相關影片都隱藏，整個 body 區塊會自動隱藏

---

## API 回應格式

API endpoint 需要返回以下 JSON 格式：

```json
{
  "status": true,
  "video": {
    "id": "video-001",
    "title": "影片標題",
    "description": "影片描述（可選）",
    "youtubeId": "dQw4w9WgXcQ"
  },
  "related": [
    {
      "id": "video-002",
      "title": "相關影片標題",
      "coverImage": "/path/to/cover.jpg"
    }
  ]
}
```

### 欄位說明

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `status` | boolean | ✅ | API 請求狀態 |
| `video` | object | ✅ | 影片詳細資料 |
| `video.id` | string | ✅ | 影片 ID |
| `video.title` | string | ✅ | 影片標題 |
| `video.description` | string | ❌ | 影片描述（可選） |
| `video.youtubeId` | string | ✅ | YouTube 影片 ID |
| `related` | array | ❌ | 相關影片陣列（可選） |
| `related[].id` | string | ✅ | 相關影片 ID |
| `related[].title` | string | ✅ | 相關影片標題 |
| `related[].coverImage` | string | ❌ | 相關影片封面圖（可選） |

### 錯誤處理

如果 API 返回錯誤，元件會：
- 關閉彈窗
- 顯示錯誤訊息（透過 `alert`）
- 在 Console 輸出錯誤詳情

---

## 程式碼結構說明

### 檔案結構

```
youtube-modal/
├── js/
│   ├── youtube-modal-component.js    # 核心元件
│   └── youtube-modal-template.js    # HTML 模板
├── css/
│   └── youtube-modal.css           # 樣式檔案
└── images/
    └── default-cover.jpg            # 預設封面圖
```

---

## 注意事項

### ✅ 建議做法

#### 使用方式

- 在頁面中只需放置**一個** `<youtube-modal>` 元件
- 透過 JavaScript 呼叫 `open()` 方法開啟不同影片
- 確保 API endpoint 正確設定

#### 樣式修改

- 如需調整樣式，請修改 `youtube-modal.css`
- **請勿修改** `youtube-modal-template.js` 中的 `id` 和 `class` 名稱
- 這些識別碼用於 JavaScript 功能綁定，修改後會導致功能異常

#### 錯誤處理

- 確保 API endpoint 可正常存取
- 檢查 API 回應格式是否正確
- 確認 `video.youtubeId` 欄位存在且有效

### ❌ 不建議做法

- **不要在同一個頁面放置多個 `<youtube-modal>` 元件**（除非有特殊需求）
- **不要直接修改 `youtube-modal-template.js` 中的結構**（除非了解影響範圍）
- **不要移除事件監聽或關閉邏輯**（會影響使用者體驗）

### 🔧 除錯技巧

若彈窗無法開啟，請檢查：

1. **元件是否正確載入**
   ```javascript
   const modal = document.querySelector('youtube-modal');
   console.log(modal); // 應該不是 null
   ```

2. **API endpoint 是否設定**
   ```javascript
   const modal = document.querySelector('youtube-modal');
   console.log(modal.endpoint); // 應該有值
   ```

3. **API 回應是否正確**
   - 開啟瀏覽器開發者工具的 Network 標籤
   - 檢查 API 請求是否成功
   - 確認回應格式是否符合規範

4. **Console 錯誤訊息**
   - 檢查是否有 JavaScript 錯誤
   - 確認是否有 CORS 或網路錯誤

### 鍵盤操作

- **ESC 鍵**：關閉彈窗
- **點擊背景**：關閉彈窗
- **點擊關閉按鈕**：關閉彈窗

---

## 相關檔案

- **元件腳本**：`youtube-modal/js/youtube-modal-component.js`
- **模板檔案**：`youtube-modal/js/youtube-modal-template.js`
- **樣式檔案**：`youtube-modal/css/youtube-modal.css`
- **預設封面**：`youtube-modal/images/default-cover.jpg`

---

