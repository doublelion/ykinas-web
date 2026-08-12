import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=86400');

  let clientMallId = req.query.mall_id || 'default_mall';

  try {
    const { data: campaign, error } = await supabase
      .from('bannerit_campaigns')
      .select(`
        id,
        bannerit_items ( id, image_url, title, subtitle, cta_text, cta_link, sort_order )
      `)
      .eq('mall_id', clientMallId)
      .eq('is_active', true)
      .order('sort_order', { referencedTable: 'bannerit_items', ascending: true })
      .single();

    if (error || !campaign || !campaign.bannerit_items || campaign.bannerit_items.length === 0) {
      return res.status(200).send(`console.log('[BannerIt] No active banners.');`);
    }

    const items = campaign.bannerit_items;
    const totalItems = items.length;

    const injectedScript = `
      (function() {
        'use strict';
        if (window.__BANNERIT_LOADED__) return;
        window.__BANNERIT_LOADED__ = true;

        if (document.cookie.indexOf('bannerit_hide_${campaign.id}=true') > -1) return;

        function initBannerIt() {
          if (!document.body) {
            window.addEventListener('DOMContentLoaded', initBannerIt);
            return;
          }

          const host = document.createElement('div');
          host.id = 'bannerit-global-root';
          host.style.cssText = 'position: fixed; z-index: 2147483647; inset: 0; pointer-events: none;'; 
          
          if (document.body.firstChild) {
            document.body.insertBefore(host, document.body.firstChild);
          } else {
            document.body.appendChild(host);
          }

          const shadow = host.attachShadow({ mode: 'closed' });
          
          const slidesHTML = \`${items.map(item => `
            <div class="snap-slide">
              <a href="${item.cta_link || '#none'}" class="slide-link" draggable="false">
                ${item.image_url ? `<img src="${item.image_url}" alt="${item.title || 'banner'}" draggable="false">` : ''}
                <div class="text-content">
                  ${item.title ? `<h2>${item.title}</h2>` : ''}
                  ${item.subtitle ? `<p>${item.subtitle}</p>` : ''}
                  ${item.cta_text ? `<div class="cta-btn">${item.cta_text}</div>` : ''}
                </div>
              </a>
            </div>
          `).join('')}\`;

          shadow.innerHTML = \`
            <style>
              :host { all: initial; font-family: 'Pretendard', -apple-system, sans-serif; }
              * { box-sizing: border-box; }
              
              /* 백드롭 설정 */
              .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); opacity: 0; transition: opacity 0.4s ease; pointer-events: auto; }
              .backdrop.show { opacity: 1; }
              
              /* ★ 바텀 시트 (Bottom-sheet) 모달 스타일 */
              .popup-container { 
                position: fixed; 
                bottom: -100%; /* 아래에 숨겨둠 */
                left: 50%; 
                transform: translateX(-50%); 
                width: 100%; 
                max-width: 420px; 
                background: #fff; 
                border-radius: 24px 24px 0 0; /* 상단만 둥글게 */
                overflow: hidden; 
                transition: bottom 0.5s cubic-bezier(0.16, 1, 0.3, 1); 
                box-shadow: 0 -10px 40px rgba(0,0,0,0.2); 
                pointer-events: auto; 
              }
              .backdrop.show + .popup-container { bottom: 0; }
              
              /* 페이징 라벨링 (1 | 3) */
              .page-indicator {
                position: absolute;
                top: 16px;
                right: 16px;
                background: rgba(0,0,0,0.6);
                color: #fff;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 700;
                z-index: 10;
                pointer-events: none;
              }

              /* 스와이퍼 영역 (PC 마우스 그랩 허용) */
              .slider-wrapper { 
                display: flex; 
                overflow-x: auto; 
                scroll-snap-type: x mandatory; 
                scrollbar-width: none; 
                -webkit-overflow-scrolling: touch; 
                cursor: grab;
              }
              .slider-wrapper:active { cursor: grabbing; }
              .slider-wrapper::-webkit-scrollbar { display: none; }
              .snap-slide { flex: 0 0 100%; scroll-snap-align: start; position: relative; user-select: none; }
              
              .slide-link { display: block; text-decoration: none; color: inherit; }
              .snap-slide img { width: 100%; aspect-ratio: 4/4; object-fit: cover; display: block; pointer-events: none; }
              
              /* 텍스트 영역 */
              .text-content { padding: 24px 20px 30px; text-align: center; background: #fff; }
              .text-content h2 { margin: 0 0 8px; font-size: 1.35rem; font-weight: 800; color: #111; letter-spacing: -0.02em; }
              .text-content p { margin: 0 0 16px; font-size: 0.95rem; color: #666; line-height: 1.4; }
              .cta-btn { display: inline-block; padding: 14px 28px; background: #111; color: #fff; border-radius: 8px; font-weight: 600; font-size: 0.95rem; }
              
              /* 하단 버튼 */
              .bottom-controls { display: flex; border-top: 1px solid #eee; background: #fafafa; }
              .bottom-controls button { flex: 1; padding: 18px 0; border: none; background: transparent; font-size: 0.9rem; font-weight: 500; color: #555; cursor: pointer; pointer-events: auto; }
              .bottom-controls button:first-child { border-right: 1px solid #eee; }
            </style>

            <div class="backdrop" id="backdrop"></div>
            <div class="popup-container" id="popup">
              ${totalItems > 1 ? `<div class="page-indicator" id="indicator">1 | ${totalItems}</div>` : ''}
              <div class="slider-wrapper" id="slider">
                \${slidesHTML}
              </div>
              <div class="bottom-controls">
                <button type="button" id="btn-hide-today">오늘 하루 열지 않기</button>
                <button type="button" id="btn-close">닫기</button>
              </div>
            </div>
          \`;

          const backdrop = shadow.getElementById('backdrop');
          const popup = shadow.getElementById('popup');
          const slider = shadow.getElementById('slider');
          const indicator = shadow.getElementById('indicator');
          
          requestAnimationFrame(() => {
            backdrop.classList.add('show');
          });

          const closePopup = () => {
            backdrop.classList.remove('show');
            popup.style.bottom = '-100%';
            setTimeout(() => host.remove(), 400);
          };

          const hideToday = () => {
            const date = new Date();
            date.setHours(23, 59, 59, 999);
            document.cookie = 'bannerit_hide_${campaign.id}=true; expires=' + date.toUTCString() + '; path=/';
            closePopup();
          };

          shadow.getElementById('btn-close').addEventListener('click', closePopup);
          shadow.getElementById('btn-hide-today').addEventListener('click', hideToday);
          backdrop.addEventListener('click', closePopup); // 바탕화면 클릭 시 닫기

          // ★ 다중 슬라이드: 페이지 인디케이터 갱신
          if (totalItems > 1) {
            slider.addEventListener('scroll', () => {
              const index = Math.round(slider.scrollLeft / slider.clientWidth);
              indicator.textContent = (index + 1) + ' | ${totalItems}';
            });
          }

          // ★ PC 환경 마우스 드래그(스와이프) 지원 로직
          let isDown = false;
          let startX;
          let scrollLeft;
          let dragged = false;

          slider.addEventListener('mousedown', (e) => {
            isDown = true;
            dragged = false;
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
          });

          slider.addEventListener('mouseleave', () => {
            isDown = false;
          });

          slider.addEventListener('mouseup', () => {
            isDown = false;
          });

          slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            dragged = true;
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 1.5; // 스크롤 속도 배율
            slider.scrollLeft = scrollLeft - walk;
          });

          // 드래그 중일 때는 a 태그 링크 이동 방지
          const links = shadow.querySelectorAll('.slide-link');
          links.forEach(link => {
            link.addEventListener('click', (e) => {
              if (dragged) {
                e.preventDefault();
              }
            });
          });

        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initBannerIt);
        } else {
          initBannerIt();
        }
      })();
    `;

    return res.status(200).send(injectedScript);
  } catch (error) {
    return res.status(500).send(`console.error('[BannerIt] Server Error.');`);
  }
}