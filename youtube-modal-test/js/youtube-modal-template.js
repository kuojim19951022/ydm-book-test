export const YOUTUBE_MODAL_TEMPLATE = `
  <div class="video-modal-overlay" id="video-modal">
    <div class="video-modal-container">
      <button class="video-modal-close" id="video-modal-close" aria-label="關閉視窗">&times;</button>
      <div class="video-modal-content">
        <div class="video-modal-header">
          <h3 class="video-modal-title" id="video-modal-title"></h3>
        </div>

      <div class="video-iframe-container" id="video-iframe-container">
        <!-- lite-youtube 將由 JS 動態插入 -->
      </div>

      <div class="video-modal-body">
        <div class="video-modal-description" id="video-modal-description"></div>
       
        <div class="video-modal-related-section" id="related-section" style="display:none;">
          <h4 class="related-title">相關影片</h4>
          <div class="video-modal-related-videos" id="video-modal-related-videos"></div>
        </div>
      </div>

      <template id="related-video-item-template">
        <div class="related-video-item" data-id="">
          <div class="related-video-cover">
            <img src="" alt="">
            <div class="related-video-play-icon">
              <div class="play-icon-triangle"></div>
            </div>
          </div>
          <p class="related-video-title"></p>
        </div>
      </template>

        <template id="youtube-iframe-template">
          <iframe class="youtube-iframe-player"></iframe>
        </template>
      </div>
    </div>
  </div>
`;



