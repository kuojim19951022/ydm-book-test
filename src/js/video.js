/**
 * 影片列表頁：從 data/video-list.json 載入資料
 * JSON 格式與指南一致：每筆為 { status, video, related }，列表與彈窗共用
 */

/** 快取完整列表（每筆為 { status, video, related }），供點擊開彈窗使用 */
let videoListCache = [];

async function loadVideoList() {
    const container = document.getElementById('video-list-container');
    const templateEl = document.getElementById('video-item-template');

    if (!container || !templateEl) {
        console.error('找不到影片列表容器或模板');
        return;
    }

    try {
        const response = await fetch('../data/video-list.json');
        if (!response.ok) throw new Error('無法載入影片資料');

        const list = await response.json();

        if (!list || list.length === 0) {
            container.innerHTML = '<p class="no-data">暫無影音資料</p>';
            return;
        }

        videoListCache = list;

        // 設定由 id 取得詳情的函式，讓彈窗內「相關影片」點擊時用靜態資料
        const modal = document.querySelector("youtube-modal");
        if (modal) {
          modal.getVideoDetailById = (id) =>
            videoListCache.find((v) => String(v.video.id) === String(id));
        }

        // 列表只顯示 video 欄位；無 coverImage 時用 YouTube 縮圖
        const ytThumb = (vid) =>
          vid.youtubeId
            ? `https://img.youtube.com/vi/${vid.youtubeId}/hqdefault.jpg`
            : "";
        const videos = list.map((item) => ({
          ...item.video,
          coverImage: item.video.coverImage || ytThumb(item.video),
        }));
        const template = Handlebars.compile(templateEl.innerHTML);
        const html = template({ videos });
        container.innerHTML = html;

        bindVideoItemClicks(container);
        console.log(`成功載入 ${list.length} 筆影片`);
    } catch (error) {
        console.error('載入影片列表時發生錯誤:', error);
        container.innerHTML = '<p class="no-data">無法載入影音資料，請稍後再試。</p>';
    }
}

function bindVideoItemClicks(container) {
    if (!container) return;
    container.addEventListener('click', (e) => {
        const item = e.target.closest('.video-item');
        if (!item) return;
        const id = item.dataset.id;
        if (!id) return;
        const data = videoListCache.find((v) => String(v.video.id) === String(id));
        if (!data) return;
        const modal = document.querySelector('youtube-modal');
        if (modal && typeof modal.openWithData === 'function') {
            modal.openWithData(data);
        }
    });
}

document.addEventListener('DOMContentLoaded', loadVideoList);
