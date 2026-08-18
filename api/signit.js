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

    const clientMallId = req.query.mall_id;

    if (!clientMallId || clientMallId.includes('{$')) {
      return res.status(200).send(`console.warn('[YKINAS Sign-It] Invalid Mall ID');`);
    }

    // DB 라이선스 검증 (has_login_module)
    const { data: license, error } = await supabase
      .from('skin_licenses')
      .select('is_active, has_login_module')
      .eq('mall_id', clientMallId)
      .maybeSingle();

    if (error || !license || !license.is_active || !license.has_login_module) {
      return res.status(200).send(`console.warn('[YKINAS Sign-It] Unauthorized or Module inactive.');`);
    }

    // E2E 클라이언트 주입 스크립트 (통합본)
    const injectedScript = `
      (function() {
        'use strict';
        if (window.__YKINAS_SIGNIT_LOADED__) return;
        window.__YKINAS_SIGNIT_LOADED__ = true;

        const currentPath = window.location.pathname;
        const isLoginPage = currentPath.includes('/member/login.html');

        // ==========================================
        // [MODE A] 로그인 전용 페이지 (Standalone Full-Screen UI)
        // ==========================================
        if (isLoginPage) {
          function renderFullScreenUI() {
            // 원본 폼 숨김 (시각적 노이즈 차단)
            const originWrap = document.getElementById('cafe24-original-wrap');
            if (originWrap) originWrap.style.display = 'none';

            if (!document.getElementById('ykinas-tailwind')) {
              const tailwind = document.createElement('link');
              tailwind.id = 'ykinas-tailwind';
              tailwind.rel = 'stylesheet';
              tailwind.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
              document.head.appendChild(tailwind);
            }

            const fullScreenHTML = \`
              <style>
                .minimal-input { border: none !important; border-bottom: 1px solid #e5e5e5 !important; border-radius: 0 !important; background-color: transparent !important; box-shadow: none !important; outline: none !important; transition: border-bottom-color 0.3s ease !important; }
                .minimal-input:focus { border-bottom-color: #111 !important; }
                .floating-label { position: absolute; left: 0; top: 10px; font-size: 0.875rem; color: #9ca3af; transition: transform 0.3s ease; pointer-events: none; }
                .minimal-input:focus~.floating-label, .minimal-input:not(:placeholder-shown)~.floating-label { transform: translateY(-120%) scale(0.85); color: #111; transform-origin: left top;}
                .fade-in { animation: fadeIn 0.4s ease-in-out forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .mode-hidden { display: none !important; }
              </style>
              <div id="ykinas-fullscreen-login" class="fixed inset-0 z-[99999] flex bg-[#faf9f8] overflow-hidden fade-in" style="font-family: 'Pretendard', 'Noto Sans KR', sans-serif;">
                <div class="hidden lg:block lg:w-7/12 relative bg-gray-900">
                  <img src="/web/upload/hero_img_02.png" alt="Editorial" class="w-full h-full object-cover opacity-90" onerror="this.src='https://via.placeholder.com/1200x800/111/333?text=Brand+Image'" />
                  <div class="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
                  <a href="/" class="absolute top-10 left-10 text-white hover:opacity-70 flex items-center gap-2 z-10 cursor-pointer">
                    <span class="text-xs tracking-widest uppercase font-medium">← Back to Shop</span>
                  </a>
                  <div class="absolute bottom-20 left-16 text-white max-w-lg">
                    <span class="text-xs uppercase tracking-[0.3em] opacity-80 mb-2 block">Exclusive Membership</span>
                    <h2 class="text-5xl font-serif tracking-wide mb-4 leading-tight">Breathtaking<br>Clarity.</h2>
                  </div>
                </div>

                <div class="w-full lg:w-5/12 bg-white shadow-2xl z-10 flex flex-col relative overflow-y-auto">
                  <a href="/" class="absolute top-6 right-6 p-2 text-gray-400 hover:text-black z-[100] text-xl font-light">✕</a>
                  
                  <div class="px-8 sm:px-14 pt-24 pb-12 flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
                    <!-- 로그인 모드 -->
                    <div id="ui-login-mode" class="fade-in">
                      <h1 class="text-2xl font-bold tracking-tight text-gray-900 mb-2">로그인</h1>
                      <p class="text-sm text-gray-500 mb-8">아이디 또는 간편 로그인으로 접속하세요.</p>
                      
                      <div class="space-y-6">
                        <div class="relative w-full">
                          <input type="text" id="custom_id" placeholder=" " class="minimal-input w-full py-2.5 text-sm" />
                          <label class="floating-label">아이디</label>
                        </div>
                        <div class="relative w-full">
                          <input type="password" id="custom_pw" placeholder=" " class="minimal-input w-full py-2.5 text-sm pr-8" />
                          <label class="floating-label">비밀번호</label>
                        </div>
                        <button type="button" id="btn_custom_login" class="w-full py-4 bg-black text-white text-sm font-semibold tracking-widest mt-4 rounded shadow-md hover:bg-gray-800 transition-colors">로그인</button>
                      </div>

                      <div class="mt-8 grid grid-cols-2 gap-2">
                         <button type="button" onclick="document.getElementById('origin_btn_kakao')?.click()" class="py-3 bg-[#FEE500] text-[#191919] text-sm font-semibold rounded flex justify-center items-center">카카오</button>
                         <button type="button" onclick="document.getElementById('origin_btn_naver')?.click()" class="py-3 bg-[#03C75A] text-white text-sm font-semibold rounded flex justify-center items-center">네이버</button>
                      </div>

                      <div class="mt-12 text-center border-t border-gray-100 pt-6">
                        <button type="button" id="btn_goto_guest" class="text-xs text-gray-400 hover:text-black underline underline-offset-4">비회원으로 주문하셨나요?</button>
                      </div>
                    </div>

                    <!-- 비회원 모드 -->
                    <div id="ui-guest-mode" class="mode-hidden fade-in">
                      <h1 class="text-2xl font-bold tracking-tight text-gray-900 mb-2 text-center">비회원 주문조회</h1>
                      <div class="space-y-6 mt-6">
                        <div class="relative w-full">
                          <input type="text" id="custom_order_name" placeholder=" " class="minimal-input w-full py-2.5 text-sm" />
                          <label class="floating-label">주문자명</label>
                        </div>
                        <div class="relative w-full">
                          <input type="text" id="custom_order_id" placeholder=" " class="minimal-input w-full py-2.5 text-sm" />
                          <label class="floating-label">주문번호 (하이픈 포함)</label>
                        </div>
                        <div class="relative w-full">
                          <input type="password" id="custom_order_pw" placeholder=" " class="minimal-input w-full py-2.5 text-sm pr-8" />
                          <label class="floating-label">주문 비밀번호</label>
                        </div>
                        <button type="button" id="btn_custom_guest" class="w-full py-4 bg-white border border-black text-black text-sm font-semibold tracking-widest mt-4 rounded hover:bg-black hover:text-white transition-colors">주문 추적하기</button>
                      </div>
                      <div class="mt-12 text-center border-t border-gray-100 pt-6">
                        <button type="button" id="btn_goto_login" class="text-xs text-gray-400 hover:text-black underline underline-offset-4">회원 로그인으로 돌아가기</button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            \`;

            document.body.insertAdjacentHTML('beforeend', fullScreenHTML);

            // 이벤트 바인딩
            document.getElementById('btn_goto_guest').onclick = () => {
              document.getElementById('ui-login-mode').classList.add('mode-hidden');
              document.getElementById('ui-guest-mode').classList.remove('mode-hidden');
            };
            document.getElementById('btn_goto_login').onclick = () => {
              document.getElementById('ui-guest-mode').classList.add('mode-hidden');
              document.getElementById('ui-login-mode').classList.remove('mode-hidden');
            };

            // Cafe24 폼 서밋 트리거
            document.getElementById('btn_custom_login').onclick = () => {
              const idInput = document.querySelector('input[name="member_id"]');
              const pwInput = document.querySelector('input[name="member_passwd"]');
              if(idInput && pwInput) {
                  idInput.value = document.getElementById('custom_id').value;
                  pwInput.value = document.getElementById('custom_pw').value;
                  document.getElementById('origin_btn_login')?.click();
              }
            };

            document.getElementById('btn_custom_guest').onclick = () => {
              const orderName = document.querySelector('input[name="order_name"]');
              const orderId = document.querySelector('input[name="order_id"]');
              const orderPw = document.querySelector('input[name="order_password"]');
              if(orderName && orderId && orderPw) {
                  orderName.value = document.getElementById('custom_order_name').value;
                  orderId.value = document.getElementById('custom_order_id').value;
                  orderPw.value = document.getElementById('custom_order_pw').value;
                  document.getElementById('origin_btn_order_history')?.click();
              }
            };

            // URL의 returnUrl 파라미터 감지하여 비회원 뷰 자동 전환
            if (window.location.search.includes('noMemberOrder') || window.location.search.includes('order/list.html')) {
              document.getElementById('btn_goto_guest').click();
            }
          }

          // [핵심] defer 타이밍 이슈 완벽 해결: 이미 로드되었으면 즉시 실행, 아니면 대기
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', renderFullScreenUI);
          } else {
            renderFullScreenUI();
          }

        } else {
          // ==========================================
          // [MODE B] 글로벌 드로어 (Global Login Drawer) - 로그인 페이지가 아닐 때만 실행
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

            // [정규식 수정 완료] 템플릿 리터럴 내부 파싱 에러 방지를 위한 이중 백슬래시 적용
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

              <div id="global-login-drawer">
                <div id="login-backdrop"></div>
                <div id="login-panel" class="custom-scrollbar-02">
                  <button type="button" id="btn_close_drawer" class="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors z-50">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  
                  <div class="px-8 sm:px-10 py-16 flex-1 flex flex-col justify-center drawer-content-wrapper">
                    <div id="ui-login-mode">
                      <h2 class="text-2xl font-bold tracking-tight text-gray-900 mb-2">로그인</h2>
                      <p class="text-sm text-gray-500 mb-8">SNS 간편 로그인 또는 아이디로 편리하게 접속하세요.</p>
                      
                      <div class="space-y-2 mb-6">
                        <button type="button" id="btn_sns_kakao" class="w-full flex items-center justify-center py-3 bg-kakao text-sm font-semibold rounded hover:opacity-90 transition-opacity {$display_kakao|display}">
                          <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.6-.2.8-1 3.5-1 3.6 0 .1.1.2.3.2.1 0 .2 0 .3-.1.6-.4 4.3-2.9 5-3.3.7.1 1.3.1 2 .1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z" /></svg>
                          카카오로 시작하기
                        </button>
                        
                        <div class="grid grid-cols-2 gap-2">
                          <button type="button" id="btn_sns_naver" class="sns-grid-btn bg-naver {$display_naver|display}">
                            <span class="w-4 h-4 flex items-center justify-center font-bold text-[10px] mr-1">N</span> 네이버
                          </button>
                          <button type="button" id="btn_sns_google" class="sns-grid-btn bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 {$display_google|display}">
                            <svg class="w-4 h-4 mr-1.5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                            구글
                          </button>
                          <button type="button" id="btn_sns_apple" class="sns-grid-btn bg-apple {$display_apple|display}">
                            <svg class="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 384 512"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-96.2 20.7-22 0-53-22.9-86-22.9-49.8 0-96.3 35.6-122 85.7-52.7 101.4-13.8 247.9 36.6 320.1 24.3 34.6 52.8 70.9 88.5 69.4 34.6-1.5 48.7-22.4 90.4-22.4 41.7 0 53.6 22.4 90.1 22.4 37.9 0 62.7-32.9 86.8-68.5 16-23.7 22.7-47 23.3-48.5-1.1-.5-45.7-17-45.9-66.6zM245.9 64.6c20.5-24.8 34.3-59.5 30.6-94.6-29.5 1.2-65.7 19.8-87.3 44.8-17.7 20.5-33.8 55.7-29.4 89.8 33.3 2.6 65.5-15.2 86.1-40z"/></svg>
                            Apple
                          </button>
                          <button type="button" id="btn_sns_facebook" class="sns-grid-btn bg-facebook {$display_facebook|display}">
                            <svg class="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 320 512"><path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"/></svg>
                            Facebook
                          </button>
                          <button type="button" id="btn_sns_line" class="sns-grid-btn bg-line {$display_line|display}">
                            <span class="font-bold text-[11px] mr-1 tracking-wider">LINE</span> 라인
                          </button>
                          <button type="button" id="btn_sns_yahoojp" class="sns-grid-btn bg-yahoojp {$display_yahoojp|display}">
                            <span class="font-bold text-[12px] italic mr-1">Y!</span> Yahoo
                          </button>
                        </div>
                      </div>

                      <div class="relative flex items-center py-2">
                        <div class="flex-grow border-t border-gray-100"></div>
                        <span class="flex-shrink-0 mx-4 text-[11px] text-gray-400">또는 아이디로 로그인</span>
                        <div class="flex-grow border-t border-gray-100"></div>
                      </div>
                      
                      <div class="space-y-4 mt-5">
                        <div class="relative w-full">
                          <input type="text" id="s_id" placeholder=" " required autocomplete="username" class="minimal-input w-full py-2.5 text-sm text-gray-900" />
                          <label class="floating-label">아이디</label>
                        </div>
                        <div class="relative w-full">
                          <input type="password" id="s_pw" placeholder=" " required autocomplete="current-password" class="minimal-input w-full py-2.5 text-sm text-gray-900 pr-8" />
                          <label class="floating-label">비밀번호</label>
                          <button type="button" id="btn_toggle_pw" class="absolute right-0 top-2.5 text-gray-400 hover:text-black">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>
                        <div class="flex items-center justify-between mt-2 mb-4">
                          <label class="flex items-center cursor-pointer group">
                            <input type="checkbox" id="s_save_id" class="w-3.5 h-3.5 text-black border-gray-300 rounded focus:ring-black cursor-pointer" checked>
                            <span class="ml-2 text-xs text-gray-500 group-hover:text-black transition-colors">보안 접속</span>
                          </label>
                        </div>
                        <button type="button" id="btn_submit_login" class="w-full py-3.5 bg-btn-primary text-sm font-semibold tracking-widest transition-colors rounded mt-4">로그인</button>
                      </div>

                      <div class="flex justify-center items-center space-x-4 mt-6 text-[11px] text-gray-400">
                        <a href="/member/id/find_id.html" class="hover:text-black transition-colors">아이디 찾기</a><span class="w-px h-2.5 bg-gray-200"></span>
                        <a href="/member/passwd/find_passwd_info.html" class="hover:text-black transition-colors">비밀번호 찾기</a><span class="w-px h-2.5 bg-gray-200"></span>
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

            if (skinPrefix) {
              const allLinks = shadowRoot.querySelectorAll('a');
              allLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('/')) {
                  link.setAttribute('href', skinPrefix + href);
                }
              });
            }

            shadowRoot.querySelector('#btn_close_drawer').addEventListener('click', window.YkinasLogin.close);
            backdrop.addEventListener('click', window.YkinasLogin.close);

            shadowRoot.querySelector('#btn_toggle_pw').addEventListener('click', function() {
              const pw = shadowRoot.querySelector('#s_pw');
              pw.type = pw.type === 'password' ? 'text' : 'password';
            });

            shadowRoot.querySelector('#btn_submit_login').addEventListener('click', function() {
               const idVal = shadowRoot.querySelector('#s_id').value.trim();
               const pwVal = shadowRoot.querySelector('#s_pw').value.trim();
               if (!idVal || !pwVal) { 
                 alert("아이디와 비밀번호를 모두 입력해주세요."); 
                 return; 
               }
               
               const originWrapInner = document.getElementById('hidden-cafe24-login-module') || document.getElementById('cafe24-original-wrap');
               if (originWrapInner && originWrapInner.querySelector('input[name="member_id"]')) { 
                 originWrapInner.querySelector('input[name="member_id"]').value = idVal; 
                 originWrapInner.querySelector('input[name="member_passwd"]').value = pwVal; 
                 (document.getElementById('hidden_btn_login') || document.getElementById('origin_btn_login')).click(); 
               } else {
                 try {
                   const iframe = document.getElementById('ykinas_proxy_iframe');
                   const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                   const ifId = iframeDoc.querySelector('input[name="member_id"]');
                   const ifPw = iframeDoc.querySelector('input[name="member_passwd"]');
                   const ifBtn = iframeDoc.getElementById('origin_btn_login');

                   if (ifId && ifPw && ifBtn) {
                     ifId.value = idVal;
                     ifPw.value = pwVal;
                     
                     const form = ifId.closest('form');
                     if (form) {
                       form.target = "_parent"; 
                       let retInput = form.querySelector('input[name="returnUrl"]');
                       if (!retInput) {
                         retInput = iframeDoc.createElement('input');
                         retInput.type = 'hidden';
                         retInput.name = 'returnUrl';
                         form.appendChild(retInput);
                       }
                       retInput.value = window.location.pathname + window.location.search;
                     }
                     ifBtn.click();
                   } else {
                     throw new Error("Iframe form not found");
                   }
                 } catch (e) {
                   window.location.href = skinPrefix + '/member/login.html?returnUrl=' + encodeURIComponent(window.location.pathname + window.location.search);
                 }
               }
            });

            function handleSnsLogin(provider) {
              try {
                const rawUrl = window.location.pathname + window.location.search;
                const safeReturnUrl = encodeURIComponent(decodeURIComponent(rawUrl));
                
                const providerMap = {
                  kakao: 'Kakao', naver: 'Naver', google: 'Google',
                  facebook: 'Facebook', line: 'Line', apple: 'Apple', yahoojp: 'Yahoojp'
                };
                const pName = providerMap[provider];
                const cafe24Provider = provider === 'google' ? 'googleplus' : provider;
                
                const originBtn = document.getElementById('origin_btn_' + provider);
                if (originBtn) {
                  originBtn.click();
                  return; 
                }

                if (window.MemberAction && typeof window.MemberAction.snsLogin === 'function') {
                  window.MemberAction.snsLogin(cafe24Provider, rawUrl);
                } else {
                  let iframeSuccess = false;
                  if (provider !== 'google') {
                    try {
                      const iframe = document.getElementById('ykinas_proxy_iframe');
                      if (iframe && iframe.contentWindow && typeof iframe.contentWindow.MemberAction.snsLogin === 'function') {
                        iframe.contentWindow.MemberAction.snsLogin(cafe24Provider, rawUrl);
                        iframeSuccess = true;
                      }
                    } catch (iframeErr) {
                      console.warn('[YKINAS] Iframe access restricted.');
                    }
                  }

                  if (!iframeSuccess) {
                    const popupUrl = '/Api/Member/Oauth2Client/' + pName + '/?returnUrl=' + safeReturnUrl;
                    const snsPopup = window.open(popupUrl, 'snsLoginPopup', 'width=500,height=600,scrollbars=yes');
                    if (!snsPopup || snsPopup.closed || typeof snsPopup.closed === 'undefined') {
                      alert('팝업이 차단되었습니다. 브라우저 주소창 우측에서 팝업 차단을 해제해주세요.');
                    }
                  }
                }
              } catch (error) {
                console.error('[YKINAS SNS Login Error]:', error);
                alert('SNS 로그인 초기화 중 오류가 발생했습니다.');
              } finally {
                window.YkinasLogin.close();
              }
            }

            ['kakao', 'naver', 'google', 'apple', 'facebook', 'line', 'yahoojp'].forEach(provider => {
              const btn = shadowRoot.querySelector('#btn_sns_' + provider);
              if (btn) btn.addEventListener('click', () => handleSnsLogin(provider));
            });

            function syncRealtimeSnsVisibility() {
              const snsMap = {
                kakao: '.btnKakao', naver: '.btnNaver', google: '.btnGoogle',
                apple: '.btnApple', facebook: '.btnFacebook', line: '.btnLine', yahoojp: '.yahoojp'
              };
              
              const syncDisplay = (sourceDoc) => {
                if (!sourceDoc) return;
                Object.entries(snsMap).forEach(([key, selector]) => {
                  const originEl = sourceDoc.querySelector(selector);
                  const shadowBtn = shadowRoot.querySelector('#btn_sns_' + key);
                  if (shadowBtn && originEl) {
                    if (originEl.classList.contains('displaynone') || window.getComputedStyle(originEl).display === 'none') {
                      shadowBtn.style.display = 'none';
                    }
                  }
                });
              };

              const localWrap = document.getElementById('hidden-cafe24-login-module') || document.getElementById('cafe24-original-wrap');
              if (localWrap) syncDisplay(localWrap);

              const iframeNode = document.getElementById('ykinas_proxy_iframe');
              if (iframeNode) {
                iframeNode.addEventListener('load', () => {
                  try { syncDisplay(iframeNode.contentDocument || iframeNode.contentWindow.document); } catch (e) {}
                });
              }
            }
            syncRealtimeSnsVisibility();
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