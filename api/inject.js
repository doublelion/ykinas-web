import { createClient } from '@supabase/supabase-js';

// Vercel 환경변수 세팅값 불러오기
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // CORS 및 캐싱 차단 (소스코드 유출 방지 및 보안 헤더 세팅)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  const clientReferer = req.headers['referer'] || '';
  const clientMallId = req.query.mall_id || '';

  try {
    // 1. Supabase DB 라이선스 검증 (Mall ID + 허용 도메인 다중 조회)
    const { data: license, error } = await supabase
      .from('skin_licenses')
      .select(`
        id,
        is_active,
        skin_allowed_domains ( domain )
      `)
      .eq('mall_id', clientMallId)
      .eq('is_active', true)
      .single();

    // 2. 검증 실패 시 (무단 복제 스킨) -> 콘솔 경고 후 자폭
    if (error || !license) {
      return res.status(200).send(`console.warn('[YKINAS Core] Unauthorized skin license.');`);
    }

    // 3. 도메인 핑거프린팅 검증 (개발주소 / 대표 도메인 일치 여부)
    const allowedDomains = license.skin_allowed_domains.map(d => d.domain);
    const isDomainMatch = allowedDomains.some(domain => clientReferer.includes(domain));

    if (!isDomainMatch) {
      return res.status(200).send(`console.warn('[YKINAS Core] Domain verification failed.');`);
    }

    // 4. 검증 성공 -> Shadow DOM (Closed Mode) 샌드박스 주입 스크립트 반환
    // 4. 검증 성공 -> Shadow DOM 샌드박스 주입
    const injectedScript = `
      (function() {
        'use strict';
        if (window.__YKINAS_SKIN_LOADED__) return;
        window.__YKINAS_SKIN_LOADED__ = true;

        document.addEventListener("DOMContentLoaded", function() {
          const originWrap = document.getElementById('hidden-cafe24-login-module') || document.getElementById('cafe24-original-wrap');
          if (originWrap) originWrap.style.display = 'none';

          const host = document.createElement('div');
          host.id = 'ykinas-skin-sandbox';
          document.body.appendChild(host);

          const shadow = host.attachShadow({ mode: 'closed' });

          shadow.innerHTML = \`
            <style>
              :host { all: initial; font-family: 'Noto Sans KR', sans-serif; }
              
              /* 평소에는 숨겨둠 (pointer-events와 opacity로 제어) */
              .drawer-backdrop {
                position: fixed; inset: 0; z-index: 99999;
                background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px);
                display: flex; justify-content: flex-end;
                opacity: 0; pointer-events: none;
                transition: opacity 0.4s ease;
              }
              .drawer-backdrop.is-open {
                opacity: 1; pointer-events: auto;
              }
              
              /* 패널 슬라이드 애니메이션 */
              .drawer-panel {
                width: 100%; max-width: 440px; height: 100%;
                background: #ffffff; padding: 56px 40px;
                display: flex; flex-direction: column; justify-content: center;
                position: relative; overflow-y: auto;
                transform: translateX(100%);
                transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
              }
              .drawer-backdrop.is-open .drawer-panel {
                transform: translateX(0);
              }
              
              /* 닫기 버튼 및 인풋 디자인 생략 (기존과 동일) */
              .close-btn { position: absolute; top: 28px; right: 28px; background: none; border: none; font-size: 20px; cursor: pointer; color: #999; }
              .close-btn:hover { color: #111; }
              .minimal-input { width: 100%; border: none; border-bottom: 1px solid #e5e5e5; padding: 12px 0; font-size: 14px; outline: none; margin-bottom: 24px; transition: 0.3s; }
              .minimal-input:focus { border-bottom-color: #111; }
              .btn-submit { width: 100%; background: #111; color: #fff; padding: 16px 0; border: none; cursor: pointer; }
            </style>

            <div class="drawer-backdrop" id="drawer_backdrop">
              <div class="drawer-panel">
                <button type="button" class="close-btn" id="s_close_btn">✕</button>
                <h2 style="font-size:24px; font-weight:bold; margin-bottom: 8px;">로그인</h2>
                <p style="font-size:13px; color:#767676; margin-bottom:32px;">브랜드 전용 혜택을 확인하세요.</p>
                
                <input type="text" id="s_id" class="minimal-input" placeholder="아이디">
                <input type="password" id="s_pw" class="minimal-input" placeholder="비밀번호">
                <button type="button" id="s_login_btn" class="btn-submit">로그인</button>
              </div>
            </div>
          \`;

          const backdrop = shadow.querySelector('#drawer_backdrop');

          // [핵심] 카페24 헤더에서 호출할 수 있도록 window 객체에 함수(리모컨) 노출
          window.YkinasLogin = {
            open: function() {
              backdrop.classList.add('is-open');
              document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
            },
            close: function() {
              backdrop.classList.remove('is-open');
              document.body.style.overflow = '';
            }
          };

          // 닫기 버튼 이벤트
          shadow.querySelector('#s_close_btn').addEventListener('click', window.YkinasLogin.close);
          
          // 배경 클릭 시 닫기
          backdrop.addEventListener('click', function(e) {
            if (e.target === backdrop) window.YkinasLogin.close();
          });

          // 로그인 대리 클릭 로직 (기존과 동일)
          shadow.querySelector('#s_login_btn').addEventListener('click', function() {
            // ... (카페24 origin_btn_login 클릭 로직)
          });
        });
      })();
    `;
    return res.status(200).send(injectedScript);

  } catch (err) {
    return res.status(500).send(`console.error('[YKINAS Core] Initialization error.');`);
  }
}