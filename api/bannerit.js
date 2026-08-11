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
        bannerit_items ( image_url, title, subtitle, cta_text, cta_link, sort_order )
      `)
      .eq('mall_id', clientMallId)
      .eq('is_active', true)
      .order('sort_order', { referencedTable: 'bannerit_items', ascending: true })
      .single();

    if (error || !campaign || !campaign.bannerit_items || campaign.bannerit_items.length === 0) {
      return res.status(200).send(`console.log('[BannerIt] No active banners.');`);
    }

    const items = campaign.bannerit_items;

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
          // ★ 클릭 방해 해제: pointer-events: none 으로 설정 후 모달 내부만 auto로 처리
          host.style.cssText = 'position: fixed; z-index: 2147483647; inset: 0; pointer-events: none;'; 
          
          // 타사 위젯보다 위에 위치하도록 body의 최우선 자식으로 삽입
          if (document.body.firstChild) {
            document.body.insertBefore(host, document.body.firstChild);
          } else {
            document.body.appendChild(host);
          }

          const shadow = host.attachShadow({ mode: 'closed' });
          
          const slidesHTML = \`${items.map(item => `
            <div class="snap-slide">
              <a href="${item.cta_link || '#none'}" class="slide-link">
                ${item.image_url ? `<img src="${item.image_url}" alt="${item.title || 'banner'}">` : ''}
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
              /* 백드롭 및 모달 내부는 포인터 이벤트를 정상 수신 */
              .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); opacity: 0; transition: opacity 0.4s ease; display: flex; justify-content: center; align-items: center; padding: 20px; pointer-events: auto; }
              .backdrop.show { opacity: 1; }
              
              .popup-container { background: #fff; width: 100%; max-width: 400px; border-radius: 16px; overflow: hidden; transform: translateY(20px); opacity: 0; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 20px 40px rgba(0,0,0,0.15); pointer-events: auto; }
              .backdrop.show .popup-container { transform: translateY(0); opacity: 1; }
              
              .slider-wrapper { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
              .slider-wrapper::-webkit-scrollbar { display: none; }
              .snap-slide { flex: 0 0 100%; scroll-snap-align: start; position: relative; }
              
              .slide-link { display: block; text-decoration: none; color: inherit; cursor: pointer; }
              .snap-slide img { width: 100%; aspect-ratio: 4/4; object-fit: cover; display: block; }
              
              .text-content { padding: 24px 20px; text-align: center; background: #fff; }
              .text-content h2 { margin: 0 0 8px; font-size: 1.25rem; font-weight: 700; color: #111; letter-spacing: -0.02em; }
              .text-content p { margin: 0 0 16px; font-size: 0.95rem; color: #666; line-height: 1.4; }
              .cta-btn { display: inline-block; padding: 12px 24px; background: #111; color: #fff; border-radius: 8px; font-weight: 600; font-size: 0.9rem; }
              
              .bottom-controls { display: flex; border-top: 1px solid #eee; background: #fafafa; }
              .bottom-controls button { flex: 1; padding: 16px 0; border: none; background: transparent; font-size: 0.85rem; color: #555; cursor: pointer; transition: background 0.2s; pointer-events: auto; }
              .bottom-controls button:hover { background: #f0f0f0; }
              .bottom-controls button:first-child { border-right: 1px solid #eee; }
            </style>

            <div class="backdrop" id="backdrop">
              <div class="popup-container">
                <div class="slider-wrapper">
                  \${slidesHTML}
                </div>
                <div class="bottom-controls">
                  <button type="button" id="btn-hide-today">오늘 하루 열지 않기</button>
                  <button type="button" id="btn-close">닫기</button>
                </div>
              </div>
            </div>
          \`;

          const backdrop = shadow.getElementById('backdrop');
          
          requestAnimationFrame(() => {
            backdrop.classList.add('show');
          });

          const closePopup = () => {
            backdrop.classList.remove('show');
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