import { YOUTUBE_MODAL_TEMPLATE } from "./youtube-modal-template.js";

class YoutubeModal extends HTMLElement {
  // === 顯示行為控制 ===
  static CONFIG = {
    SHOW_TITLE: true,
    SHOW_DESCRIPTION: true,
    SHOW_RELATED_DEFAULT: true,
    PLAYER_TYPE: "lite-youtube", // 播放器類型預設值，可選：'lite-youtube' | 'iframe'
  };

  // === 播放器參數配置 ===
  static PLAYER_VARS = {
    autoplay: 1, // 點擊後自動播放
    controls: 1, // 顯示播放器控制項
    rel: 0, // 相關影片只顯示同頻道
    playsinline: 1, // iOS 內嵌播放
    modestbranding: 0, // 顯示 YouTube 品牌
    enablejsapi: 0, // 啟用 YouTube IFrame Player API（配合 js-api 屬性使用）
    iv_load_policy: 3, // 不顯示影片註解
  };

  // === lite-youtube元件屬性配置 ===
  static ELEMENT_ATTRS = {
    jsApi: false, // ← 必須設為 true 才能啟用完整功能
  };

  // === 快取與 Promise 管理 ===
  static cssCache = null;
  static liteYoutubeCSS = null;
  static liteYoutubeLoadPromise = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.endpoint = null;
    this.elements = {};
    this.showRelated = YoutubeModal.CONFIG.SHOW_RELATED_DEFAULT;
    this.showDescription = YoutubeModal.CONFIG.SHOW_DESCRIPTION;
    this.showTitle = YoutubeModal.CONFIG.SHOW_TITLE;
    this._keydownHandler = (e) => {
      if (e.key === "Escape" && this.isOpen()) this.close();
    };
  }

  // === 初始化完成旗標 ===
  #initialized = false;

  // === 播放器類型（由 connectedCallback 決定）===
  #playerType = "lite-youtube";

  async connectedCallback() {
    const attrEndpoint = this.getAttribute("endpoint");
    const globalEndpoint = window.YOUTUBE_MODAL_ENDPOINT;
    this.endpoint = attrEndpoint || globalEndpoint || "";
    this.showRelated = this.#getBooleanAttribute(
      "show-related",
      YoutubeModal.CONFIG.SHOW_RELATED_DEFAULT,
    );
    // 讀取播放器類型：HTML 屬性優先，否則使用 CONFIG 預設值
    this.#playerType = this.#getPlayerType();
    // 僅在 lite-youtube 模式下才載入外部腳本
    if (this.#playerType === "lite-youtube") {
      await this.#loadLiteYoutube();
    }
    await this.#render();
    this.#initElements();
    this.#initEventListeners();
    this.#initialized = true;
  }

  // === 等待自定義元素註冊完成（共用 polling 邏輯）===
  #waitForCustomElement(name, resolve, reject, timeout = 5000) {
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

  // === 載入 lite-youtube-embed 腳本和樣式 ===
  async #loadLiteYoutube() {
    if (YoutubeModal.liteYoutubeLoadPromise) {
      return YoutubeModal.liteYoutubeLoadPromise;
    }
    if (customElements.get("lite-youtube")) {
      YoutubeModal.liteYoutubeLoadPromise = Promise.resolve();
      return YoutubeModal.liteYoutubeLoadPromise;
    }
    YoutubeModal.liteYoutubeLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/lite-youtube-embed/0.3.3/lite-yt-embed.js";
      script.integrity =
        "sha512-WKiiKu2dHNBXgIad9LDYeXL80USp6v+PmhRT5Y5lIcWonM2Avbn0jiWuXuh7mL2d5RsU3ZmIxg5MiWMEMykghA==";
      script.crossOrigin = "anonymous";
      script.referrerPolicy = "no-referrer";
      const existingScript = document.querySelector(
        `script[src="${script.src}"]`,
      );
      if (existingScript) {
        if (customElements.get("lite-youtube")) {
          resolve();
        } else {
          this.#waitForCustomElement("lite-youtube", resolve, reject);
        }
      } else {
        script.onload = () => {
          this.#waitForCustomElement("lite-youtube", resolve, reject);
        };
        script.onerror = () => {
          reject(new Error("lite-youtube-embed 腳本載入失敗"));
        };
        document.head.appendChild(script);
      }
    });
    return YoutubeModal.liteYoutubeLoadPromise;
  }

  // === 載入 lite-youtube CSS（用於 Shadow DOM）===
  async #loadLiteYoutubeCSS() {
    const cacheKey = "liteYoutubeCSS";
    if (YoutubeModal[cacheKey]) {
      return YoutubeModal[cacheKey];
    }

    try {
      const response = await fetch(
        "https://cdnjs.cloudflare.com/ajax/libs/lite-youtube-embed/0.3.3/lite-yt-embed.css",
      );
      if (response.ok) {
        const cssText = await response.text();
        YoutubeModal[cacheKey] = cssText;
        return cssText;
      }
      return "";
    } catch (error) {
      console.error("載入 lite-youtube CSS 失敗:", error);
      return "";
    }
  }

  // === 載入元件自身的 CSS ===
  async #loadCSS() {
    if (YoutubeModal.cssCache) {
      return YoutubeModal.cssCache;
    }
    // 取得 timestamp 用於版本控制（避免瀏覽器快取）
    const timestamp = window.APP_TIMESTAMP || Date.now();
    const cssPath = `${this.#getBasePath()}/css/youtube-modal.css?v=${timestamp}`;
    try {
      const response = await fetch(cssPath);
      if (response.ok) {
        const cssText = await response.text();
        YoutubeModal.cssCache = cssText;
        return cssText;
      }
      return "";
    } catch (error) {
      console.error("載入 YouTube Modal CSS 失敗:", error);
      return "";
    }
  }

  // === 渲染組件（注入 CSS 和 HTML 模板）===
  async #render() {
    const css = await this.#loadCSS();
    // 僅在 lite-youtube 模式下才需要注入 lite-youtube CSS
    const liteYoutubeCSS =
      this.#playerType === "lite-youtube"
        ? await this.#loadLiteYoutubeCSS()
        : "";
    const template = YOUTUBE_MODAL_TEMPLATE;
    this.shadowRoot.innerHTML = `
            <style>${css}</style>
            <style>${liteYoutubeCSS}</style>
            ${template}
        `;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  }

  // === 初始化元素引用 ===
  #initElements() {
    const root = this.shadowRoot;
    this.elements = {
      modal: root.querySelector("#video-modal"),
      closeBtn: root.querySelector("#video-modal-close"),
      title: root.querySelector("#video-modal-title"),
      iframeContainer: root.querySelector("#video-iframe-container"),
      body: root.querySelector(".video-modal-body"),
      description: root.querySelector("#video-modal-description"),
      relatedSection: root.querySelector("#related-section"),
      relatedContainer: root.querySelector("#video-modal-related-videos"),
      relatedItemTemplate: root.querySelector("#related-video-item-template"),
      iframeTemplate: root.querySelector("#youtube-iframe-template"),
    };
  }

  // === 初始化事件監聽 ===
  #initEventListeners() {
    const { closeBtn, modal, relatedContainer } = this.elements;
    // 關閉按鈕
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.close());
    }
    // 點擊背景關閉
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.close();
        }
      });
    }
    // ESC 鍵關閉
    document.addEventListener("keydown", this._keydownHandler);
    // 監聽相關影片點擊 (使用事件委派)
    // 若頁面有設定 getVideoDetailById（靜態資料），優先用它並 openWithData；否則用 open 打 API
    if (relatedContainer) {
      relatedContainer.addEventListener("click", (e) => {
        const item = e.target.closest(".related-video-item");
        if (item) {
          const newVideoId = item.dataset.id;
          if (typeof this.getVideoDetailById === "function") {
            const data = this.getVideoDetailById(newVideoId);
            if (data && data.video) {
              this.openWithData(data);
              return;
            }
          }
          this.open(newVideoId);
        }
      });
    }
  }

  // ========================================
  // 公共 API 方法
  // ========================================

  // 開啟彈窗並載入影片
  async open(videoId) {
    if (!videoId) {
      console.error("缺少影片 ID");
      return;
    }
    const { title, description, modal } = this.elements;
    // 先清理所有舊資料（防禦性清理：處理直接切換影片或前次殘留）
    this.#clearContent();
    // 顯示載入中狀態
    if (title) title.textContent = "載入中...";
    if (modal) modal.classList.add("active");
    document.body.style.overflow = "hidden";
    try {
      // 取得影片詳細資料
      const response = await fetch(
        `${this.endpoint}?id=${encodeURIComponent(videoId)}`,
      );
      const data = await response.json();
      if (data.status && data.video) {
        this.#applyData(data);
      } else {
        this.close();
        alert(data.message || "無法載入影片資料");
      }
    } catch (error) {
      console.error("載入影片資料失敗:", error);
      this.close();
      alert("載入影片失敗，請稍後再試");
    }
  }

  /**
   * 使用已有資料開啟彈窗（不發送 API 請求）
   * 格式需與指南一致：{ status: true, video: { id, title, description?, youtubeId }, related?: [] }
   */
  openWithData(data) {
    if (!data || !data.video) {
      console.error("openWithData 需要傳入 { status, video, related? }");
      return;
    }
    const { title, modal } = this.elements;
    this.#clearContent();
    if (title) title.textContent = data.video.title || "";
    if (modal) modal.classList.add("active");
    document.body.style.overflow = "hidden";
    if (!data.video.youtubeId) {
      this.close();
      alert("此影片沒有 YouTube 連結");
      return;
    }
    this.#applyData(data);
  }

  /** 依 API/指南格式渲染標題、描述、播放器、相關影片（open / openWithData 共用）*/
  #applyData(data) {
    const { title, description } = this.elements;
    const video = data.video;
    const youtubeId = video.youtubeId;
    if (!youtubeId) {
      this.close();
      alert("此影片沒有 YouTube 連結");
      return;
    }
    if (title) {
      if (this.showTitle) {
        title.textContent = video.title || "";
        title.style.display = "";
      } else {
        title.textContent = "";
        title.style.display = "none";
      }
    }
    if (description) {
      const hasDescription =
        typeof video.description === "string" &&
        video.description.trim() !== "";
      const shouldShow = this.showDescription !== false && hasDescription;
      description.textContent = shouldShow ? video.description : "";
      description.style.display = shouldShow ? "" : "none";
    }
    this.#createPlayer(youtubeId, video.title);
    this.#renderRelatedVideos(data.related);
    this.#updateBodyVisibility();
  }

  // === 渲染相關影片列表 ===
  #renderRelatedVideos(related) {
    const { relatedSection, relatedContainer, relatedItemTemplate } =
      this.elements;
    const defaultCover = `${this.#getBasePath()}/images/default-cover.jpg`;
    if (!this.showRelated || !related || related.length === 0) {
      if (relatedSection) relatedSection.style.display = "none";
      return;
    }
    if (
      relatedContainer &&
      relatedItemTemplate &&
      relatedItemTemplate.content
    ) {
      const templateRoot = relatedItemTemplate.content.firstElementChild;
      const fragment = document.createDocumentFragment();
      related.forEach((video) => {
        if (!templateRoot) return;
        const item = templateRoot.cloneNode(true);
        item.dataset.id = video.id || "";
        const img = item.querySelector("img");
        if (img) {
          const coverSrc =
            video.coverImage ||
            (video.youtubeId
              ? `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`
              : defaultCover);
          img.src = coverSrc;
          img.alt = this.#escapeHtml(video.title);
        }
        const title = item.querySelector(".related-video-title");
        if (title) {
          title.textContent = video.title || "";
        }
        fragment.appendChild(item);
      });
      relatedContainer.innerHTML = "";
      relatedContainer.appendChild(fragment);
    } else {
      if (relatedSection) relatedSection.style.display = "none";
      return;
    }
    if (relatedSection) relatedSection.style.display = "flex";
  }

  // === 工具方法 ===

  // HTML 轉義（防止 XSS）
  #escapeHtml(text) {
    if (!text) return "";
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
  }

  // === 取得播放器類型（HTML 屬性優先，否則使用 CONFIG 預設值）===
  #getPlayerType() {
    const attrValue = this.getAttribute("player-type");
    const validTypes = ["lite-youtube", "iframe"];
    if (attrValue && validTypes.includes(attrValue)) {
      return attrValue;
    }
    return YoutubeModal.CONFIG.PLAYER_TYPE || "lite-youtube";
  }

  // === 建立播放器統一入口（依 #playerType 路由至對應實作）===
  #createPlayer(youtubeId, videoTitle = "") {
    const { iframeContainer } = this.elements;
    if (!iframeContainer) return;
    if (this.#playerType === "iframe") {
      this.#createIframePlayer(youtubeId, videoTitle);
    } else {
      this.#createLiteYoutubePlayer(youtubeId, videoTitle);
    }
  }

  // === 建立 lite-youtube 播放器 ===
  #createLiteYoutubePlayer(youtubeId, videoTitle = "") {
    const { iframeContainer } = this.elements;
    if (!iframeContainer) return;
    // 建立 lite-youtube 元素
    const el = document.createElement("lite-youtube");
    // 設定影片 ID（必需）
    el.setAttribute("videoid", youtubeId);
    // 應用播放器參數（從 PLAYER_VARS 動態生成）
    const params = new URLSearchParams(YoutubeModal.PLAYER_VARS).toString();
    el.setAttribute("params", params);
    // 應用元素屬性（從 ELEMENT_ATTRS 讀取配置）
    if (YoutubeModal.ELEMENT_ATTRS.jsApi) {
      el.setAttribute("js-api", "");
    }
    // 動態 playlabel：如果有影片標題則使用，否則使用預設值
    const playlabel =
      videoTitle && videoTitle.trim()
        ? `播放：${videoTitle.trim()}`
        : "播放影片";
    el.setAttribute("playlabel", playlabel);
    // 掛載到容器
    iframeContainer.appendChild(el);
  }

  // === 建立標準 YouTube iframe 播放器 ===
  #createIframePlayer(youtubeId, videoTitle = "") {
    const { iframeContainer, iframeTemplate } = this.elements;
    if (!iframeContainer || !iframeTemplate) return;
    // 從 template 複製 iframe 元素
    const iframe = iframeTemplate.content
      .cloneNode(true)
      .querySelector("iframe");
    if (!iframe) return;
    // 組合播放器參數（autoplay 強制開啟）
    const params = new URLSearchParams({
      ...YoutubeModal.PLAYER_VARS,
      autoplay: 1,
    }).toString();
    iframe.src = `https://www.youtube.com/embed/${youtubeId}?${params}`;
    iframe.title = videoTitle || "播放影片";
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
    );
    // 掛載到容器
    iframeContainer.appendChild(iframe);
  }

  // 更新 body 顯示狀態
  #updateBodyVisibility() {
    const { body, description, relatedSection } = this.elements;
    if (!body) return;
    const descriptionVisible =
      description && description.style.display !== "none";
    const relatedVisible =
      relatedSection && relatedSection.style.display !== "none";
    body.style.display = descriptionVisible || relatedVisible ? "" : "none";
  }

  // 解析 HTML 布林屬性
  #getBooleanAttribute(name, fallback) {
    if (!this.hasAttribute(name)) return fallback;
    const value = this.getAttribute(name);
    if (value === null || value === "") return true;
    return !/^(false|0|no|off)$/i.test(value.trim());
  }

  // 取得元件資源根路徑
  #getBasePath() {
    const attrPath = this.getAttribute("base-path");
    const globalPath = window.YOUTUBE_MODAL_BASE_PATH;
    const basePath = attrPath || globalPath || this.#getAutoBasePath();
    return this.#normalizePath(basePath);
  }

  #getAutoBasePath() {
    try {
      return new URL("..", import.meta.url).href;
    } catch (_) {
      return "";
    }
  }

  #normalizePath(path) {
    if (!path) return "";
    const isAbsolute = /^(https?:)?\/\//.test(path) || path.startsWith("/");
    const resolved = isAbsolute
      ? path
      : new URL(path, window.location.href).href;
    return resolved.replace(/\/+$/, "");
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this._keydownHandler);
  }

  // === 清理所有內容資料（防止資料外洩）===
  #clearContent() {
    const {
      title,
      description,
      iframeContainer,
      relatedContainer,
      relatedSection,
    } = this.elements;
    // 清空標題
    if (title) {
      title.textContent = "";
      title.style.display = "";
    }
    // 清空描述
    if (description) {
      description.textContent = "";
      description.style.display = "none";
    }
    // 清空播放器
    if (iframeContainer) {
      iframeContainer.innerHTML = "";
    }
    // 清空相關影片列表
    if (relatedContainer) {
      relatedContainer.innerHTML = "";
    }
    if (relatedSection) {
      relatedSection.style.display = "none";
    }
  }

  // 關閉彈窗並清理所有資料
  close() {
    if (!this.#initialized) return;
    this.elements.modal.classList.remove("active");
    this.#clearContent();
    document.body.style.overflow = "";
  }

  // 檢查彈窗是否開啟
  isOpen() {
    if (!this.#initialized) return false;
    return this.elements.modal.classList.contains("active");
  }
}

// 註冊自定義元素
if (!customElements.get("youtube-modal")) {
  customElements.define("youtube-modal", YoutubeModal);
}
