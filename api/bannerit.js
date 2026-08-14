import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');

  // ★ 강력한 서버 방어막: Vercel CDN이 1시간 동안 응답을 캐싱
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');

  let clientMallId = req.query.mall_id;

  if (!clientMallId || clientMallId === '{$mall_id}') {
    return res.status(200).send(`console.error('[BannerIt] Mall ID is required.');`);
  }

  try {
    // [1단계] 마스터 라이선스 교차 검증 (권한 누수 차단)
    const { data: license, error: licenseError } = await supabase
      .from('skin_licenses')
      .select('is_active, has_bannerit_module')
      .eq('mall_id', clientMallId)
      .maybeSingle();

    if (licenseError || !license || !license.is_active || !license.has_bannerit_module) {
      return res.status(200).send(`console.warn('[BannerIt] Unauthorized or License Expired.');`);
    }

    // [2단계] 캠페인 및 슬라이드 데이터 조회
    const { data: campaign, error: campaignError } = await supabase
      .from('bannerit_campaigns')
      .select(`
        id,
        bannerit_items ( id, image_url, title, subtitle, cta_text, cta_link, sort_order )
      `)
      .eq('mall_id', clientMallId)
      .eq('is_active', true)
      .order('sort_order', { referencedTable: 'bannerit_items', ascending: true })
      .maybeSingle();

    if (campaignError || !campaign || !campaign.bannerit_items || campaign.bannerit_items.length === 0) {
      return res.status(200).send(`console.log('[BannerIt] No active banners.');`);
    }

    const items = campaign.bannerit_items;
    const totalItems = items.length;

    const navButtonsHTML = totalItems > 1 ? `
      <button type="button" class="nav-btn prev-btn" id="btn-prev">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button type="button" class="nav-btn next-btn" id="btn-next">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    ` : '';

    const injectedScript = `
      (function() {
        'use strict';
        if (window.__BANNERIT_LOADED__) return;
        window.__BANNERIT_LOADED__ = true;

        const currentPath = window.location.pathname;
        if (currentPath !== '/' && currentPath !== '/index.html' && currentPath !== '') {
          return; 
        }

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
              
              .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); opacity: 0; transition: opacity 0.4s ease; pointer-events: auto; }
              .backdrop.show { opacity: 1; }
              
              .popup-container { 
                position: fixed; 
                bottom: -100%; 
                left: 50%; 
                transform: translateX(-50%); 
                width: 100%; 
                max-width: 420px; 
                background: #fff; 
                border-radius: 24px 24px 0 0; 
                overflow: hidden; 
                transition: bottom 0.5s cubic-bezier(0.16, 1, 0.3, 1); 
                box-shadow: 0 -10px 40px rgba(0,0,0,0.2); 
                pointer-events: auto; 
              }
              .backdrop.show + .popup-container { bottom: 0; }
              
              .page-indicator {
                position: absolute; top: 16px; right: 16px; background: rgba(0, 0, 0, 0.45);
                backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
                padding: 5px 12px; border-radius: 14px; font-size: 0.75rem; z-index: 10; pointer-events: none;
                display: flex; align-items: center; gap: 4px; letter-spacing: 0.3px;
              }
              .page-indicator .current { font-weight: 700; color: #ffffff; }
              .page-indicator .divider { font-weight: 400; color: rgba(255, 255, 255, 0.4); font-size: 0.65rem; }
              .page-indicator .total { font-weight: 500; color: rgba(255, 255, 255, 0.7); }

              .nav-btn {
                position: absolute; top: 35%; transform: translateY(-50%); background: rgba(255, 255, 255, 0.9);
                border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex;
                justify-content: center; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10; color: #333; pointer-events: auto; transition: opacity 0.2s;
              }
              .prev-btn { left: 16px; }
              .next-btn { right: 16px; }
              .nav-btn svg { width: 18px; height: 18px; }
              
              @media (max-width: 768px) { .nav-btn { display: none !important; } }

              .slider-wrapper { 
                display: flex; overflow-x: auto; scroll-snap-type: x mandatory; 
                scrollbar-width: none; -webkit-overflow-scrolling: touch; cursor: grab;
              }
              .slider-wrapper:active { cursor: grabbing; }
              .slider-wrapper::-webkit-scrollbar { display: none; }
              .snap-slide { flex: 0 0 100%; scroll-snap-align: start; position: relative; user-select: none; }
              
              .slide-link { display: block; text-decoration: none; color: inherit; }
              .snap-slide img { width: 100%; aspect-ratio: 4/4; object-fit: cover; display: block; pointer-events: none; }
              
              .text-content { padding: 24px 20px 30px; text-align: center; background: #fff; }
              
              /* 🛠️ [Fix 1] CSS 텍스트 말줄임표 처리 및 높이 방어 */
              .text-content h2 { 
                margin: 0 0 8px; font-size: 1.35rem; font-weight: 600; color: #111; letter-spacing: -0.02em;
                display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; word-break: keep-all; 
              }
              .text-content p { 
                margin: 0 0 16px; font-size: 0.95rem; color: #666; line-height: 1.4;
                display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; word-break: keep-all; 
              }
              
              .cta-btn { display: inline-block; padding: 14px 28px; background: #111; color: #fff; border-radius: 8px; font-weight: 600; font-size: 0.95rem; }
              
              .bottom-controls { display: flex; border-top: 1px solid #eee; background: #fafafa; }
              .bottom-controls button { flex: 1; padding: 18px 0; border: none; background: transparent; font-size: 0.9rem; font-weight: 500; color: #555; cursor: pointer; pointer-events: auto; }
              .bottom-controls button:first-child { border-right: 1px solid #eee; }
            </style>

            <div class="backdrop" id="backdrop"></div>
            <div class="popup-container" id="popup">
              ${totalItems > 1 ? `
                <div class="page-indicator" id="indicator">
                  <span class="current">1</span>
                  <span class="divider">/</span>
                  <span class="total">${totalItems}</span>
                </div>
              ` : ''}
              
              ${navButtonsHTML}
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
          const btnPrev = shadow.getElementById('btn-prev');
          const btnNext = shadow.getElementById('btn-next');
          
          requestAnimationFrame(() => {
            backdrop.classList.add('show');
          });

          // 🛠️ [Fix 2] 오토플레이 로직 추가
          let autoplayTimer = null;
          const startAutoplay = () => {
            if (${totalItems} <= 1) return;
            stopAutoplay();
            autoplayTimer = setInterval(() => {
              const maxScrollLeft = slider.scrollWidth - slider.clientWidth;
              // 마지막 슬라이드인 경우 처음으로 롤백, 아니면 다음으로 이동
              if (slider.scrollLeft >= maxScrollLeft - 5) {
                slider.scrollTo({ left: 0, behavior: 'smooth' });
              } else {
                slider.scrollBy({ left: slider.clientWidth, behavior: 'smooth' });
              }
            }, 3000); // 3초 대기
          };

          const stopAutoplay = () => {
            if (autoplayTimer) clearInterval(autoplayTimer);
          };

          const closePopup = () => {
            stopAutoplay(); // 팝업 닫힐 때 타이머 정리
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
          backdrop.addEventListener('click', closePopup); 

          if (${totalItems} > 1) {
            const updateUI = () => {
              const index = Math.round(slider.scrollLeft / slider.clientWidth);
              
              if (indicator) {
                indicator.innerHTML = \`
                  <span class="current">\${index + 1}</span>
                  <span class="divider">/</span>
                  <span class="total">${totalItems}</span>
                \`;
              }

              if (btnPrev) {
                btnPrev.style.opacity = index === 0 ? '0.3' : '1';
                btnPrev.style.cursor = index === 0 ? 'not-allowed' : 'pointer';
              }
              if (btnNext) {
                btnNext.style.opacity = index === ${totalItems - 1} ? '0.3' : '1';
                btnNext.style.cursor = index === ${totalItems - 1} ? 'not-allowed' : 'pointer';
              }
            };

            slider.addEventListener('scroll', updateUI);
            updateUI(); 

            if (btnPrev) {
              btnPrev.addEventListener('click', () => {
                slider.scrollBy({ left: -slider.clientWidth, behavior: 'smooth' });
              });
            }
            if (btnNext) {
              btnNext.addEventListener('click', () => {
                slider.scrollBy({ left: slider.clientWidth, behavior: 'smooth' });
              });
            }

            // 🛠️ [Fix 2-1] UX 방어: 팝업 영역에 마우스/터치 진입 시 오토플레이 일시정지
            popup.addEventListener('mouseenter', stopAutoplay);
            popup.addEventListener('mouseleave', startAutoplay);
            popup.addEventListener('touchstart', stopAutoplay, { passive: true });
            popup.addEventListener('touchend', startAutoplay, { passive: true });
            
            // 초기 렌더링 시 오토플레이 시작
            startAutoplay();
          }

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

          slider.addEventListener('mouseleave', () => { isDown = false; });
          slider.addEventListener('mouseup', () => { isDown = false; });

          slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            dragged = true;
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 1.5; 
            slider.scrollLeft = scrollLeft - walk;
          });

          const links = shadow.querySelectorAll('.slide-link');
          links.forEach(link => {
            link.addEventListener('click', (e) => {
              if (dragged) e.preventDefault();
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