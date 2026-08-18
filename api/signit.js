import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=0, must-revalidate');

    const clientReferer = req.headers['referer'] || '';
    const clientMallId = req.query.mall_id;

    const sendDisabledScript = (reason) => {
      return res.status(200).send(`
        (function() {
          console.warn('[YKINAS Sign-It] Disabled: ${reason}');
          const existingHost = document.getElementById('ykinas-global-drawer-root');
          if (existingHost) existingHost.remove();
          const existingIframe = document.getElementById('ykinas_proxy_iframe');
          if (existingIframe) existingIframe.remove();
        })();
      `);
    };

    if (!clientMallId || clientMallId === '{$mall_id}') {
      return sendDisabledScript('Mall ID is missing or invalid placeholder.');
    }

    const { data: license, error } = await supabase
      .from('skin_licenses')
      .select('id, is_active, has_login_module, skin_allowed_domains ( domain )')
      .eq('mall_id', clientMallId)
      .maybeSingle();

    if (error || !license || !license.is_active || !license.has_login_module) {
      return sendDisabledScript('Unauthorized or module has_login_module is FALSE.');
    }

    const allowedDomains = license.skin_allowed_domains ? license.skin_allowed_domains.map(d => d.domain) : [];
    const isDomainMatch = allowedDomains.length === 0 || allowedDomains.some(domain => clientReferer.includes(domain)) || clientReferer === '';

    if (!isDomainMatch) {
      return sendDisabledScript('Domain mismatch.');
    }

    const injectedScript = `
      (function() {
        'use strict';
        
        if (window.self !== window.top || window.__YKINAS_SKIN_LOADED__) return;
        window.__YKINAS_SKIN_LOADED__ = true;

        const currentPath = window.location.pathname;
        const isLoginPage = currentPath.includes('/member/login.html');

        // ==========================================
        // [MODE A] 로그인 전용 페이지 (Standalone Full-Screen UI)
        // ==========================================
        if (isLoginPage) {
          function renderFullScreenUI() {
            // 원본 폼 숨김
            const originWrap = document.getElementById('cafe24-original-wrap');
            if (originWrap) originWrap.style.display = 'none';

            if (!document.getElementById('ykinas-tailwind')) {
              const tailwind = document.createElement('link');
              tailwind.id = 'ykinas-tailwind';
              tailwind.rel = 'stylesheet';
              tailwind.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
              document.head.appendChild(tailwind);
            }

            // 대표님의 UI + CSS 원본 100% 반영
            const fullScreenHTML = \`
              <style>
                .minimal-input {
                  border: none !important;
                  border-bottom: 1px solid #e5e5e5 !important;
                  border-radius: 0 !important;
                  background-color: transparent !important;
                  box-shadow: none !important;
                  outline: none !important;
                  transition: border-bottom-color 0.3s ease !important;
                }
                .minimal-input:focus {
                  border-bottom-color: #111 !important;
                }
                .floating-label {
                  position: absolute;
                  left: 0;
                  top: 10px;
                  font-size: 0.875rem;
                  color: #9ca3af;
                  transition: transform 0.3s ease, color 0.3s ease;
                  pointer-events: none;
                }
                .minimal-input:focus~.floating-label,
                .minimal-input:not(:placeholder-shown)~.floating-label {
                  transform: translateY(-120%) scale(0.85);
                  color: #111;
                  transform-origin: left top;
                }
                .fade-in {
                  animation: fadeIn 0.4s ease-in-out forwards;
                }
                @keyframes fadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                .mode-hidden {
                  display: none !important;
                }
              </style>

              <div class="fixed inset-0 z-[99999] flex bg-[#faf9f8] overflow-hidden fade-in" style="font-family: 'Pretendard', sans-serif;">
                <div class="hidden lg:block lg:w-7/12 relative bg-gray-900">
                  <img src="/web/upload/hero_img_02.png" alt="Brand Editorial Campaign" class="w-full h-full object-cover opacity-90" onerror="this.src='https://via.placeholder.com/1200x800/111/333?text=Brand+Image'" />
                  <div class="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
                  <a href="javascript:void(0);" onclick="closeLoginStandalone(event)" class="absolute top-10 left-10 !bg-transparent text-white hover:opacity-70 transition-opacity flex items-center gap-2 z-10 cursor-pointer">
                    <span class="text-xs tracking-widest uppercase font-medium">← Back to Shop</span>
                  </a>
                  <div class="absolute bottom-20 left-16 text-white max-w-lg">
                    <span class="text-xs uppercase tracking-[0.3em] opacity-80 mb-2 block font-sans">Exclusive Membership</span>
                    <h2 class="text-5xl font-serif tracking-wide mb-4 leading-tight">Breathtaking<br>Clarity.</h2>
                    <p class="text-sm tracking-wide font-light opacity-80 leading-relaxed">지금 가입하시고 첫 구매 혜택과 프라이빗 컬렉션 소식을 가장 먼저 받아보세요.</p>
                  </div>
                </div>

                <div class="w-full lg:w-5/12 bg-white shadow-2xl z-10 flex flex-col relative custom-scrollbar-02 overflow-y-auto" id="standalone_panel">
                  <button type="button" onclick="closeLoginStandalone(event)" class="absolute top-6 right-6 p-2 text-gray-400 !bg-transparent hover:bg-gray-100 hover:text-black rounded-full transition-colors z-[100] text-xl">
                    ✕
                  </button>

                  <div class="px-8 sm:px-14 pt-24 pb-12 flex-1 flex flex-col justify-center">
                    <div class="w-full max-w-sm mx-auto relative">
                      
                      <!-- [모드 A] 회원 로그인 UI -->
                      <div id="ui-login-mode" class="fade-in">
                        <div class="mb-10">
                          <h1 class="text-2xl font-bold tracking-tight text-gray-900 mb-2">로그인</h1>
                          <p class="text-sm text-gray-500">SNS 간편 로그인 또는 아이디로 접속하세요.</p>
                        </div>

                        <div class="space-y-3 mb-8">
                          <button type="button" onclick="triggerSNS('kakao')" class="w-full flex items-center justify-center py-3.5 bg-[#FEE500] text-[#191919] text-sm font-semibold rounded transition-opacity hover:opacity-90 shadow-sm">
                            카카오로 시작하기
                          </button>
                          <div class="flex gap-2">
                            <button type="button" onclick="triggerSNS('naver')" class="flex-1 flex items-center justify-center py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors">
                              네이버
                            </button>
                            <button type="button" onclick="triggerSNS('google')" class="flex-1 flex items-center justify-center py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors">
                              구글
                            </button>
                          </div>
                        </div>

                        <div class="relative flex items-center py-4">
                          <div class="flex-grow border-t border-gray-200"></div>
                          <span class="flex-shrink-0 mx-4 text-xs text-gray-400">또는 일반 아이디 로그인</span>
                          <div class="flex-grow border-t border-gray-200"></div>
                        </div>

                        <div class="space-y-6 mt-6">
                          <div class="relative w-full">
                            <input type="text" id="custom_id" placeholder=" " required autocomplete="username" class="minimal-input w-full py-2.5 text-sm text-gray-900" /><label class="floating-label" for="custom_id">아이디</label>
                          </div>
                          <div class="relative w-full">
                            <input type="password" id="custom_pw" placeholder=" " required autocomplete="current-password" class="minimal-input w-full py-2.5 text-sm text-gray-900 pr-8" /><label class="floating-label" for="custom_pw">비밀번호</label>
                            <button type="button" onclick="togglePassword('custom_pw')" class="absolute right-0 top-2.5 text-gray-400 hover:text-black transition-colors p-0.5">👁</button>
                          </div>
                          <button type="button" onclick="submitCustomLogin()" class="w-full py-4 bg-black text-white text-sm font-semibold tracking-widest hover:bg-gray-800 transition-colors mt-4 rounded shadow-md active:scale-[0.99] transform">로그인</button>
                        </div>

                        <div class="flex justify-center items-center space-x-4 mt-6 text-xs text-gray-500">
                          <a href="/member/id/find_id.html" class="hover:text-black transition-colors">아이디 찾기</a><span class="w-px h-3 bg-gray-300"></span>
                          <a href="/member/passwd/find_passwd_info.html" class="hover:text-black transition-colors">비밀번호 찾기</a><span class="w-px h-3 bg-gray-300"></span>
                          <a href="/member/agreement.html" class="font-bold text-black border-b border-black pb-0.5">회원가입</a>
                        </div>

                        <div class="mt-12 text-center border-t border-gray-100 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))] lg:pb-6">
                          <button type="button" onclick="redirectToGuestMode()" class="p-2 text-xs text-gray-400 hover:text-black underline underline-offset-4 transition-colors active:opacity-70">
                            비회원으로 주문하셨나요?
                          </button>
                        </div>
                      </div>

                      <!-- [모드 B] 비회원 주문조회 UI -->
                      <div id="ui-guest-mode" class="mode-hidden fade-in">
                        <div class="mb-10 text-center">
                          <h1 class="text-2xl font-bold tracking-tight text-gray-900 mb-2 mt-4">비회원 주문조회</h1>
                          <p class="text-sm text-gray-500">주문 시 입력하신 정보를 입력해 주세요.</p>
                        </div>

                        <div class="space-y-6 mt-6">
                          <div class="relative w-full">
                            <input type="text" id="custom_order_name" placeholder=" " autocomplete="off" class="minimal-input w-full py-2.5 text-sm text-gray-900" /><label class="floating-label">주문자명</label>
                          </div>
                          <div class="relative w-full">
                            <input type="text" id="custom_order_id" placeholder=" " autocomplete="off" class="minimal-input w-full py-2.5 text-sm text-gray-900" /><label class="floating-label">주문번호 (하이픈 포함)</label>
                          </div>
                          <div class="relative w-full">
                            <input type="password" id="custom_order_pw" placeholder=" " autocomplete="off" class="minimal-input w-full py-2.5 text-sm text-gray-900 pr-8" /><label class="floating-label">주문 비밀번호</label>
                            <button type="button" onclick="togglePassword('custom_order_pw')" class="absolute right-0 top-2.5 text-gray-400 hover:text-black transition-colors">👁</button>
                          </div>
                          <button type="button" onclick="submitCustomGuest()" class="w-full py-4 bg-white border border-black text-black text-sm font-semibold tracking-widest hover:bg-black hover:text-white transition-colors mt-4 rounded shadow-sm">주문 추적하기</button>
                        </div>

                        <div class="mt-12 text-center border-t border-gray-100 pt-6">
                          <button type="button" onclick="switchMode('login')" class="text-xs text-gray-400 hover:text-black underline underline-offset-4 transition-colors">회원 로그인으로 돌아가기</button>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            \`;

            document.body.insertAdjacentHTML('beforeend', fullScreenHTML);

            // ==========================================
            // 인라인 이벤트 바인딩 전역 객체 (window) 등록
            // ==========================================
            window.redirectToGuestMode = function() {
              window.location.replace('/member/login.html?noMemberOrder&returnUrl=' + encodeURIComponent('/myshop/order/list.html'));
            };

            window.switchMode = function(mode) {
              const loginMode = document.getElementById('ui-login-mode');
              const guestMode = document.getElementById('ui-guest-mode');
              const panel = document.getElementById('standalone_panel');

              if (mode === 'guest') {
                if (loginMode) loginMode.classList.add('mode-hidden');
                if (guestMode) guestMode.classList.remove('mode-hidden');
              } else {
                if (guestMode) guestMode.classList.add('mode-hidden');
                if (loginMode) loginMode.classList.remove('mode-hidden');
              }
              if (panel) panel.scrollTop = 0;
            };

            window.closeLoginStandalone = function(e) {
              if (e) e.preventDefault();
              if (document.referrer && document.referrer.includes(location.host)) {
                window.history.back();
              } else {
                window.location.href = '/';
              }
            };

            window.triggerSNS = function(type) {
              const originSnsBtn = document.getElementById('origin_btn_' + type);
              if (originSnsBtn) originSnsBtn.click();
            };

            window.submitCustomLogin = function() {
              const customIdVal = document.getElementById('custom_id').value.trim();
              const customPwVal = document.getElementById('custom_pw').value.trim();
              if (!customIdVal || !customPwVal) return alert("아이디와 비밀번호를 모두 입력해주세요.");

              const originWrap = document.getElementById('cafe24-original-wrap');
              if (!originWrap) return;
              const originId = originWrap.querySelector('input[name="member_id"]');
              const originPw = originWrap.querySelector('input[name="member_passwd"]');
              const originBtn = document.getElementById('origin_btn_login');

              if (originId && originPw && originBtn) {
                originId.value = customIdVal;
                originPw.value = customPwVal;
                originBtn.click();
              }
            };

            window.submitCustomGuest = function() {
              const customNameVal = document.getElementById('custom_order_name').value.trim();
              const customIdVal = document.getElementById('custom_order_id').value.trim();
              const customPwVal = document.getElementById('custom_order_pw').value.trim();
              if (!customNameVal || !customIdVal || !customPwVal) return alert("주문자 정보를 모두 입력해주세요.");

              const originWrap = document.getElementById('cafe24-original-wrap');
              if (!originWrap) return;
              const originName = originWrap.querySelector('input[name="order_name"]');
              const originId = originWrap.querySelector('input[name="order_id"]');
              const originPw = originWrap.querySelector('input[name="order_password"]');
              const originBtn = document.getElementById('origin_btn_order_history');

              if (originName && originId && originPw && originBtn) {
                originName.value = customNameVal;
                originId.value = customIdVal;
                originPw.value = customPwVal;
                originBtn.click();
              }
            };

            window.togglePassword = function(inputId) {
              const pwInput = document.getElementById(inputId);
              pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
            };

            // Enter 키 이벤트 리스너 바인딩
            const customPwEl = document.getElementById('custom_pw');
            if(customPwEl) {
              customPwEl.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') window.submitCustomLogin();
              });
            }

            const customOrderPwEl = document.getElementById('custom_order_pw');
            if(customOrderPwEl) {
              customOrderPwEl.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') window.submitCustomGuest();
              });
            }

            // 라우팅 초기화 실행
            const searchStr = window.location.search;
            const urlParams = new URLSearchParams(searchStr);
            const returnUrl = urlParams.get('returnUrl') || '';

            if (searchStr.includes('noMemberOrder') || returnUrl.includes('order/list.html')) {
              window.switchMode('guest');
            } else {
              window.switchMode('login');
            }
          }

          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', renderFullScreenUI);
          } else {
            renderFullScreenUI();
          }

        } else {
          // ==========================================
          // [MODE B] 글로벌 드로어 (Global Login Drawer) - 기존 코드 유지
          // ==========================================
          document.addEventListener('click', function(e) {
            const target = e.target.closest('a');
            if (!target) return;
            const href = target.getAttribute('href') || '';
            const requireLoginPaths = ['/myshop/index.html', '/myshop/wish_list.html', '/member/modify.html'];
            const isRequireLogin = requireLoginPaths.some(path => href.includes(path));
            const isLoggedOut = document.querySelector('.xans-layout-statelogoff') !== null || !document.querySelector('.xans-layout-statelogon');
            
            if (isRequireLogin && isLoggedOut) {
              e.preventDefault();
              e.stopPropagation();
              if (window.YkinasLogin && typeof window.YkinasLogin.open === 'function') {
                window.YkinasLogin.open();
              }
            }
          }, true);

          let shadowRoot = null;
          let drawer = null;
          let backdrop = null;
          let panel = null;
          let isInitialized = false;

          window.YkinasLogin = {
            open: function() {
              if (!isInitialized) initShadowDOM();
              if (drawer) {
                drawer.style.display = 'flex';
                requestAnimationFrame(() => {
                  backdrop.classList.add('is-open');
                  panel.classList.add('is-open');
                });
                document.body.style.overflow = 'hidden';
              }
            },
            close: function() {
              if (drawer) {
                backdrop.classList.remove('is-open');
                panel.classList.remove('is-open');
                setTimeout(() => {
                  drawer.style.display = 'none';
                  document.body.style.overflow = '';
                }, 400); 
              }
            }
          };

          function initShadowDOM() {
            if (isInitialized) return;
            isInitialized = true;

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
            shadowRoot = host.attachShadow({ mode: 'closed' });

            shadowRoot.innerHTML = \`
              <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
              <style>
                :host { all: initial; font-family: 'Pretendard', 'Noto Sans KR', sans-serif; }
                * { box-sizing: border-box; }
                #global-login-drawer { position: fixed; inset: 0; z-index: 999999; display: none; justify-content: flex-end; }
                #login-backdrop { position: absolute; inset: 0; background-color: rgba(0,0,0,0.4); backdrop-filter: blur(4px); opacity: 0; transition: opacity 0.4s ease; cursor: pointer; }
                #login-backdrop.is-open { opacity: 1; }
                #login-panel { position: relative; width: 100%; max-width: 420px; height: 100%; background-color: #ffffff; box-shadow: -10px 0 40px rgba(0,0,0,0.1); transform: translateX(100%); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; z-index: 10; }
                #login-panel.is-open { transform: translateX(0); }
                .drawer-content-wrapper { opacity: 0; transform: translateY(20px); transition: opacity 0.4s ease 0.2s, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.2s; }
                #login-panel.is-open .drawer-content-wrapper { opacity: 1; transform: translateY(0); }
                .custom-scrollbar-02 { overflow-y: auto; }
                .custom-scrollbar-02::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar-02::-webkit-scrollbar-thumb { background: #e5e5e5; border-radius: 4px; }
                .minimal-input { border: none !important; border-bottom: 1px solid #e5e5e5 !important; border-radius: 0 !important; background-color: transparent !important; box-shadow: none !important; outline: none !important; transition: border-bottom-color 0.3s ease !important; }
                .minimal-input:focus { border-bottom-color: #111 !important; }
                .floating-label { position: absolute; left: 0; top: 10px; font-size: 0.875rem; color: #9ca3af; transition: transform 0.3s ease, color 0.3s ease; pointer-events: none; }
                .minimal-input:focus ~ .floating-label, .minimal-input:not(:placeholder-shown) ~ .floating-label { transform: translateY(-120%) scale(0.85); color: #111; transform-origin: left top; }
                .bg-kakao { background-color: #FEE500; color: #191919; }
                .bg-naver { background-color: #03C75A; color: #ffffff; }
                .bg-facebook { background-color: #1877F2; color: #ffffff; }
                .bg-line { background-color: #06C755; color: #ffffff; }
                .bg-apple { background-color: #000000; color: #ffffff; }
                .bg-yahoojp { background-color: #FF0033; color: #ffffff; }
                .sns-grid-btn { display: flex; align-items: center; justify-content: center; padding: 0.625rem; font-size: 0.8125rem; font-weight: 500; border-radius: 0.25rem; transition: opacity 0.2s ease; width: 100%; }
                .sns-grid-btn:hover { opacity: 0.85; }
                .bg-btn-primary { background-color: #111111; color: #ffffff; }
                .bg-btn-primary:hover { background-color: #333333; }
                .displaynone { display: none !important; }
              </style>
              <!-- (이전 답변의 드로어 HTML 내용 유지) -->
              <div id="global-login-drawer">
                <div id="login-backdrop"></div>
                <div id="login-panel" class="custom-scrollbar-02">
                  <button type="button" id="btn_close_drawer" class="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors z-50">✕</button>
                  <div class="px-8 sm:px-10 py-16 flex-1 flex flex-col justify-center drawer-content-wrapper">
                    <div id="ui-login-mode">
                      <h2 class="text-2xl font-bold tracking-tight text-gray-900 mb-2">로그인</h2>
                      <p class="text-sm text-gray-500 mb-8">SNS 간편 로그인 또는 아이디로 편리하게 접속하세요.</p>
                      <div class="space-y-2 mb-6">
                        <button type="button" id="btn_sns_kakao" class="w-full flex items-center justify-center py-3 bg-kakao text-sm font-semibold rounded hover:opacity-90 transition-opacity {$display_kakao|display}">카카오로 시작하기</button>
                        <div class="grid grid-cols-2 gap-2">
                          <button type="button" id="btn_sns_naver" class="sns-grid-btn bg-naver {$display_naver|display}">네이버</button>
                          <button type="button" id="btn_sns_google" class="sns-grid-btn bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 {$display_google|display}">구글</button>
                        </div>
                      </div>
                      <div class="relative flex items-center py-2">
                        <div class="flex-grow border-t border-gray-100"></div>
                        <span class="flex-shrink-0 mx-4 text-[11px] text-gray-400">또는 아이디로 로그인</span>
                        <div class="flex-grow border-t border-gray-100"></div>
                      </div>
                      <div class="space-y-4 mt-5">
                        <div class="relative w-full">
                          <input type="text" id="s_id" placeholder=" " required class="minimal-input w-full py-2.5 text-sm text-gray-900" /><label class="floating-label">아이디</label>
                        </div>
                        <div class="relative w-full">
                          <input type="password" id="s_pw" placeholder=" " required class="minimal-input w-full py-2.5 text-sm text-gray-900 pr-8" /><label class="floating-label">비밀번호</label>
                          <button type="button" id="btn_toggle_pw" class="absolute right-0 top-2.5 text-gray-400 hover:text-black">👁</button>
                        </div>
                        <button type="button" id="btn_submit_login" class="w-full py-3.5 bg-btn-primary text-sm font-semibold tracking-widest transition-colors rounded mt-4">로그인</button>
                      </div>
                      <div class="flex justify-center items-center space-x-4 mt-6 text-[11px] text-gray-400">
                        <a href="/member/agreement.html" class="font-semibold text-gray-800 hover:text-black transition-colors">회원가입</a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            \`;

            drawer = shadowRoot.querySelector('#global-login-drawer');
            backdrop = shadowRoot.querySelector('#login-backdrop');
            panel = shadowRoot.querySelector('#login-panel');

            shadowRoot.querySelector('#btn_close_drawer').addEventListener('click', window.YkinasLogin.close);
            backdrop.addEventListener('click', window.YkinasLogin.close);

            shadowRoot.querySelector('#btn_toggle_pw').addEventListener('click', function() {
              const pw = shadowRoot.querySelector('#s_pw');
              pw.type = pw.type === 'password' ? 'text' : 'password';
            });

            shadowRoot.querySelector('#btn_submit_login').addEventListener('click', function() {
               const idVal = shadowRoot.querySelector('#s_id').value.trim();
               const pwVal = shadowRoot.querySelector('#s_pw').value.trim();
               if (!idVal || !pwVal) return alert("아이디와 비밀번호를 모두 입력해주세요.");
               
               const originWrapInner = document.getElementById('hidden-cafe24-login-module') || document.getElementById('cafe24-original-wrap');
               if (originWrapInner && originWrapInner.querySelector('input[name="member_id"]')) { 
                 originWrapInner.querySelector('input[name="member_id"]').value = idVal; 
                 originWrapInner.querySelector('input[name="member_passwd"]').value = pwVal; 
                 (document.getElementById('hidden_btn_login') || document.getElementById('origin_btn_login')).click(); 
               } else {
                 try {
                   const iframe = document.getElementById('ykinas_proxy_iframe');
                   const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                   iframeDoc.querySelector('input[name="member_id"]').value = idVal;
                   iframeDoc.querySelector('input[name="member_passwd"]').value = pwVal;
                   const form = iframeDoc.querySelector('input[name="member_id"]').closest('form');
                   form.target = "_parent"; 
                   let retInput = form.querySelector('input[name="returnUrl"]');
                   if (!retInput) { retInput = iframeDoc.createElement('input'); retInput.type = 'hidden'; retInput.name = 'returnUrl'; form.appendChild(retInput); }
                   retInput.value = window.location.pathname + window.location.search;
                   iframeDoc.getElementById('origin_btn_login').click();
                 } catch (e) {
                   window.location.href = skinPrefix + '/member/login.html?returnUrl=' + encodeURIComponent(window.location.pathname + window.location.search);
                 }
               }
            });

            ['kakao', 'naver', 'google'].forEach(provider => {
              const btn = shadowRoot.querySelector('#btn_sns_' + provider);
              if (btn) btn.addEventListener('click', () => {
                const originBtn = document.getElementById('origin_btn_' + provider);
                if (originBtn) originBtn.click();
              });
            });
          }

          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initShadowDOM);
          } else {
            initShadowDOM();
          }
        }
      })();
    `;

    return res.status(200).send(injectedScript);
  } catch (err) {
    console.error(err);
    return res.status(500).send('/* Sign-It Initialization error */');
  }
}