import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const clientReferer = req.headers['referer'] || '';
  const clientMallId = req.query.mall_id || '';

  // [디버그] 요청 정보 확인
  const debugPrefix = `console.log('%c[YKINAS Check]', 'background:#333;color:#00ffcc;',`;

  if (!clientMallId) {
    return res.status(200).send(`${debugPrefix} 'Invalid Mall ID.');`);
  }

  try {
    const { data: license, error } = await supabase
      .from('skin_licenses')
      .select('id, is_active, skin_allowed_domains ( domain )')
      .eq('mall_id', clientMallId)
      .eq('is_active', true)
      .single();

    if (error || !license) {
      return res.status(200).send(`${debugPrefix} 'License Not Found or Inactive.', 'Mall ID:', '${clientMallId}');`);
    }

    const allowedDomains = license.skin_allowed_domains.map(d => d.domain);
    const isDomainMatch = allowedDomains.some(domain => clientReferer.includes(domain)) || clientReferer === '';

    if (!isDomainMatch) {
      return res.status(200).send(`${debugPrefix} 'Domain Mismatch.', 'Referer:', '${clientReferer}', 'Allowed:', ${JSON.stringify(allowedDomains)});`);
    }

    const injectedScript = `
      (function() {
        'use strict';
        
        console.log('%c[YKINAS Core]', 'background:#111;color:#fff;padding:2px 6px;border-radius:3px;', 'Script initializing...');

        if (window.self !== window.top) {
            console.log('[YKINAS Core] Iframe detected, aborting.');
            return; 
        }

        if (window.__YKINAS_SKIN_LOADED__) return;
        window.__YKINAS_SKIN_LOADED__ = true;

        // ★ [핵심 픽스] 기존 인라인 onclick의 레이스 컨디션을 흡수하는 큐(Queue) 패턴
        const YkinasLoginCore = {
          open: function() {
            console.log('[YKINAS Core] Drawer open triggered.');
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', () => this._triggerOpen());
            } else {
              this._triggerOpen();
            }
          },
          _triggerOpen: function() {
            if (!window._ykinasInitialized) initShadowDOM();
            
            const host = document.getElementById('ykinas-global-drawer-root');
            if (!host || !host.shadowRoot) return;
            
            const drawer = host.shadowRoot.querySelector('#global-login-drawer');
            const backdrop = host.shadowRoot.querySelector('#login-backdrop');
            const panel = host.shadowRoot.querySelector('#login-panel');
            
            if (drawer && backdrop && panel) {
              drawer.style.display = 'flex';
              requestAnimationFrame(() => {
                backdrop.classList.add('is-open');
                panel.classList.add('is-open');
              });
              document.body.style.overflow = 'hidden';
            }
          },
          close: function() {
            const host = document.getElementById('ykinas-global-drawer-root');
            if (!host || !host.shadowRoot) return;
            
            const drawer = host.shadowRoot.querySelector('#global-login-drawer');
            const backdrop = host.shadowRoot.querySelector('#login-backdrop');
            const panel = host.shadowRoot.querySelector('#login-panel');
            
            if (drawer && backdrop && panel) {
              backdrop.classList.remove('is-open');
              panel.classList.remove('is-open');
              setTimeout(() => {
                drawer.style.display = 'none';
                document.body.style.overflow = '';
              }, 400); 
            }
          }
        };

        // window.YkinasLogin 덮어쓰기 (인라인 이벤트와 연결)
        window.YkinasLogin = YkinasLoginCore;
        console.log('%c[YKINAS Core]', 'background:#111;color:#bada55;padding:2px 6px;border-radius:3px;', 'window.YkinasLogin is mounted successfully.');

        const currentPath = window.location.pathname;
        const currentSearch = window.location.search;
        const isLoginPage = currentPath.includes('/member/login.html');

        if (isLoginPage) {
            console.log('[YKINAS Core] Native Login Page detected. Drawer disabled.');
            document.addEventListener('click', function(e) {
                const target = e.target.closest('button, a');
                if (!target) return;
                
                const onClickAttr = target.getAttribute('onclick') || '';
                
                if (onClickAttr.includes("switchMode('guest')")) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[YKINAS Core] Guest order intercepted.');
                    window.location.href = '/member/login.html?noMemberOrder&returnUrl=%2Fmyshop%2Forder%2Flist.html';
                }
            }, true);
            return; 
        }

        window._ykinasInitialized = false;

        function initShadowDOM() {
          if (window._ykinasInitialized) return;
          if (!document.body) {
            console.warn('[YKINAS Core] Document body not ready for Shadow DOM.');
            return; 
          }
          window._ykinasInitialized = true;
          console.log('[YKINAS Core] Initializing Shadow DOM...');

          const urlParams = new URLSearchParams(currentSearch);
          const targetReturnUrl = urlParams.get('returnUrl') || (currentPath + currentSearch);
          const skinMatch = currentPath.match(/^\\/skin-[^\\/]+/);
          const skinPrefix = skinMatch ? skinMatch[0] : '';
          
          let proxyIframe = document.getElementById('ykinas_proxy_iframe');
          if (!proxyIframe) {
            proxyIframe = document.createElement('iframe');
            proxyIframe.id = 'ykinas_proxy_iframe';
            proxyIframe.src = skinPrefix + '/member/login.html';
            proxyIframe.style.cssText = 'position:absolute; width:1px; height:1px; left:-9999px; opacity:0; pointer-events:none;';
            document.body.appendChild(proxyIframe);
          }

          const originWrap = document.getElementById('hidden-cafe24-login-module') || document.getElementById('cafe24-original-wrap');
          if (originWrap) originWrap.style.display = 'none';

          const host = document.createElement('div');
          host.id = 'ykinas-global-drawer-root';
          host.style.cssText = 'position: relative; z-index: 2147483647;'; 
          document.body.appendChild(host);

          const shadowRoot = host.attachShadow({ mode: 'closed' });

          shadowRoot.innerHTML = \`
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            
            <style>
              :host { all: initial; font-family: 'Noto Sans KR', sans-serif; }
              * { font-family: 'Noto Sans KR', sans-serif; box-sizing: border-box; }
              #global-login-drawer { position: fixed; inset: 0; z-index: 999999; display: none; justify-content: flex-end; }
              #login-backdrop { position: absolute; inset: 0; background-color: rgba(0,0,0,0.4); backdrop-filter: blur(4px); opacity: 0; transition: opacity 0.4s ease; cursor: pointer; }
              #login-backdrop.is-open { opacity: 1; }
              #login-panel { position: relative; width: 100%; max-width: 420px; height: 100%; background-color: #ffffff; box-shadow: -10px 0 40px rgba(0,0,0,0.1); transform: translateX(100%); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; z-index: 10; }
              #login-panel.is-open { transform: translateX(0); }
              .drawer-content-wrapper { opacity: 0; transform: translateY(30px); transition: opacity 0.4s ease 0.3s, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.3s; }
              #login-panel.is-open .drawer-content-wrapper { opacity: 1; transform: translateY(0); }
              .custom-scrollbar-02 { overflow-y: auto; }
              .custom-scrollbar-02::-webkit-scrollbar { width: 4px; }
              .custom-scrollbar-02::-webkit-scrollbar-thumb { background: #e5e5e5; border-radius: 4px; }
              .minimal-input { border: none !important; border-bottom: 1px solid #e5e5e5 !important; border-radius: 0 !important; background-color: transparent !important; box-shadow: none !important; outline: none !important; transition: border-bottom-color 0.3s ease !important; }
              .minimal-input:focus { border-bottom-color: #111 !important; }
              .floating-label { position: absolute; left: 0; top: 10px; font-size: 0.875rem; color: #9ca3af; transition: transform 0.3s ease, color 0.3s ease; pointer-events: none; }
              .minimal-input:focus ~ .floating-label, .minimal-input:not(:placeholder-shown) ~ .floating-label { transform: translateY(-120%) scale(0.85); color: #111; transform-origin: left top; }
              .fade-in { animation: fadeIn 0.4s ease-in-out forwards; }
              @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
              .bg-kakao { background-color: #FEE500; color: #191919; }
              .bg-naver-icon { background-color: #03C75A; color: #ffffff; }
              .bg-btn-primary { background-color: #111111; color: #ffffff; }
              .bg-btn-primary:hover { background-color: #333333; }
            </style>

            <div id="global-login-drawer">
              <div id="login-backdrop"></div>
              <div id="login-panel" class="custom-scrollbar-02">
                <button type="button" id="btn_close_drawer" class="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors z-50">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div class="px-8 sm:px-10 py-16 flex-1 flex flex-col justify-center drawer-content-wrapper">
                  <div id="ui-login-mode" class="fade-in">
                    <h2 class="text-2xl font-bold tracking-tight text-gray-900 mb-2">로그인</h2>
                    <p class="text-sm text-gray-500 mb-10">SNS 간편 로그인 또는 아이디로 편리하게 접속하세요.</p>
                    <div class="space-y-3 mb-5">
                      <button type="button" id="btn_sns_kakao" class="w-full flex items-center justify-center py-3.5 bg-kakao text-sm font-semibold rounded hover:opacity-90 transition-opacity">카카오로 시작하기</button>
                    </div>
                    <div class="relative flex items-center py-2"><div class="flex-grow border-t border-gray-200"></div><span class="flex-shrink-0 mx-4 text-xs text-gray-400">또는 아이디로 로그인</span><div class="flex-grow border-t border-gray-200"></div></div>
                    <div class="space-y-4 mt-5">
                      <div class="relative w-full">
                        <input type="text" id="s_id" placeholder=" " required autocomplete="username" class="minimal-input w-full py-2.5 text-sm text-gray-900" />
                        <label class="floating-label">아이디</label>
                      </div>
                      <div class="relative w-full">
                        <input type="password" id="s_pw" placeholder=" " required autocomplete="current-password" class="minimal-input w-full py-2.5 text-sm text-gray-900 pr-8" />
                        <label class="floating-label">비밀번호</label>
                      </div>
                      <button type="button" id="btn_submit_login" class="w-full py-4 bg-btn-primary text-sm font-semibold tracking-widest transition-colors rounded shadow-md mt-6">로그인</button>
                    </div>
                    <div class="mt-12 text-center border-t border-gray-100 pt-8">
                      <button type="button" id="btn_go_guest" class="text-xs text-gray-400 hover:text-black underline underline-offset-4 transition-colors">비회원으로 주문하셨나요?</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          \`;

          const backdrop = shadowRoot.querySelector('#login-backdrop');

          shadowRoot.querySelector('#btn_close_drawer').addEventListener('click', () => window.YkinasLogin.close());
          backdrop.addEventListener('click', () => window.YkinasLogin.close());

          console.log('[YKINAS Core] Shadow DOM mounted successfully.');
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initShadowDOM);
        } else {
          initShadowDOM();
        }
      })();
    `;

    return res.status(200).send(injectedScript);
  } catch (err) {
    return res.status(500).send(`${debugPrefix} 'Initialization error.', ${JSON.stringify(err.message)});`);
  }
}