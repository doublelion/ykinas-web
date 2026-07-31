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
    const injectedScript = `
      (function() {
        'use strict';
        if (window.__YKINAS_SKIN_LOADED__) return;
        window.__YKINAS_SKIN_LOADED__ = true;

        document.addEventListener("DOMContentLoaded", function() {
          // 기존 카페24 올드 폼 화면에서 완벽 숨김
          const originWrap = document.getElementById('cafe24-original-wrap');
          if (originWrap) originWrap.style.display = 'none';

          // Shadow DOM Host 생성
          const host = document.createElement('div');
          host.id = 'ykinas-skin-sandbox';
          document.body.appendChild(host);

          // Closed Mode로 샌드박스 결합 (F12 소스 복사 원천 차단)
          const shadow = host.attachShadow({ mode: 'closed' });

          // 2026 CVR 최적화 프리미엄 UI & 스타일 주입
          shadow.innerHTML = \`
            <style>
              :host { all: initial; font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif; }
              * { box-sizing: border-box; margin: 0; padding: 0; }
              
              .drawer-backdrop {
                position: fixed; inset: 0; z-index: 99999;
                background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px);
                display: flex; justify-content: flex-end;
                animation: fadeIn 0.3s ease-out;
              }
              .drawer-panel {
                width: 100%; max-width: 440px; height: 100%;
                background: #ffffff; padding: 56px 40px;
                display: flex; flex-direction: column; justify-content: center;
                position: relative; overflow-y: auto;
                box-shadow: -10px 0 30px rgba(0,0,0,0.05);
              }
              .close-btn {
                position: absolute; top: 28px; right: 28px;
                background: none; border: none; font-size: 20px; cursor: pointer;
                color: #999; transition: color 0.2s; padding: 8px;
              }
              .close-btn:hover { color: #111; }
              
              .title { font-size: 24px; font-weight: 700; color: #111; margin-bottom: 8px; letter-spacing: -0.02em; }
              .subtitle { font-size: 13px; color: #767676; margin-bottom: 36px; line-height: 1.5; }
              
              .input-group { position: relative; margin-bottom: 24px; }
              .minimal-input {
                width: 100%; border: none; border-bottom: 1px solid #e5e5e5;
                padding: 12px 0; font-size: 14px; color: #111; outline: none;
                background: transparent; transition: border-color 0.3s;
              }
              .minimal-input:focus { border-bottom-color: #111; }
              
              .btn-kakao {
                width: 100%; bg-color: #FEE500; background: #FEE500; color: #191919;
                padding: 15px 0; font-size: 14px; font-weight: 600; border: none;
                border-radius: 4px; cursor: pointer; margin-bottom: 12px;
                display: flex; align-items: center; justify-content: center; gap: 8px;
              }
              .btn-submit {
                width: 100%; background: #111111; color: #ffffff;
                padding: 16px 0; font-size: 13px; font-weight: 600;
                letter-spacing: 0.1em; border: none; border-radius: 4px;
                cursor: pointer; margin-top: 12px; transition: background 0.2s;
              }
              .btn-submit:hover { background: #333; }

              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            </style>

            <div class="drawer-backdrop">
              <div class="drawer-panel">
                <button type="button" class="close-btn" id="s_close_btn">✕</button>
                <h2 class="title">로그인</h2>
                <p class="subtitle">SNS 간편 로그인 또는 아이디로 접속하세요.</p>
                
                <button type="button" class="btn-kakao" id="s_kakao_btn">
                  카카오 3초 만에 시작하기
                </button>

                <div class="input-group" style="margin-top: 24px;">
                  <input type="text" id="s_id" class="minimal-input" placeholder="아이디" autocomplete="username">
                </div>
                <div class="input-group">
                  <input type="password" id="s_pw" class="minimal-input" placeholder="비밀번호" autocomplete="current-password">
                </div>
                
                <button type="button" id="s_login_btn" class="btn-submit">로그인</button>
              </div>
            </div>
          \`;

          // 닫기 버튼
          shadow.querySelector('#s_close_btn').addEventListener('click', function() {
            host.remove();
            window.__YKINAS_SKIN_LOADED__ = false;
          });

          // 카카오 대리 클릭
          shadow.querySelector('#s_kakao_btn').addEventListener('click', function() {
            const originKakao = document.getElementById('origin_btn_kakao');
            if (originKakao) originKakao.click();
          });

          // 일반 로그인 대리 클릭 (Proxy)
          shadow.querySelector('#s_login_btn').addEventListener('click', function() {
            const idVal = shadow.querySelector('#s_id').value.trim();
            const pwVal = shadow.querySelector('#s_pw').value.trim();

            if (!idVal || !pwVal) {
              alert('아이디와 비밀번호를 모두 입력해 주세요.');
              return;
            }

            const originId = document.querySelector('input[name="member_id"]');
            const originPw = document.querySelector('input[name="member_passwd"]');
            const originBtn = document.getElementById('origin_btn_login') || document.getElementById('hidden_btn_login');

            if (originId && originPw && originBtn) {
              originId.value = idVal;
              originPw.value = pwVal;
              originBtn.click();
            }
          });
        });
      })();
    `;

    return res.status(200).send(injectedScript);

  } catch (err) {
    return res.status(500).send(`console.error('[YKINAS Core] Initialization error.');`);
  }
}