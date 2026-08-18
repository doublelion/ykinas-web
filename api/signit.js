import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    // [백엔드 최적화] 글로벌 Edge CDN 캐싱 적용
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Cafe24-Api-Version', '2026-03-01');

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

        let ykinasShadowRoot = null;
        const originalAlert = window.alert;
        window.alert = function(msg) {
          const globalLoader = document.getElementById('ykinas-global-loader');
          if (globalLoader) globalLoader.style.display = 'none';

          if (ykinasShadowRoot) {
            const drawerLoader = ykinasShadowRoot.querySelector('#ykinas-drawer-loader');
            if (drawerLoader) drawerLoader.style.display = 'none';
          }
          originalAlert(msg);
        };

        const currentPath = window.location.pathname;
        const isLoginPage = currentPath.includes('/member/login.html');

        // ==========================================
        // [MODE A] 로그인 전용 페이지 (Standalone Full-Screen UI)
        // ==========================================
        if (isLoginPage) {
          function renderFullScreenUI() {
            const originWrap = document.getElementById('cafe24-original-wrap');
            if (originWrap) originWrap.style.display = 'none';

            if (!document.getElementById('ykinas-tailwind')) {
              const tailwind = document.createElement('link');
              tailwind.id = 'ykinas-tailwind';
              tailwind.rel = 'stylesheet';
              tailwind.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
              document.head.appendChild(tailwind);
            }

            const customConfig = window.YKINAS_SIGNIT_CONFIG || {};
            const heroImage = customConfig.heroImage || '/web/upload/hero_img_02.png';
            const subTitle = customConfig.subTitle || 'Exclusive Membership';
            const mainTitle = customConfig.mainTitle || 'Breathtaking<br>Clarity.';
            const descTxt = customConfig.description || '지금 가입하시고 첫 구매 혜택과 프라이빗 컬렉션 소식을 가장 먼저 받아보세요.';

            const fullScreenHTML = \`
              <style>
                .minimal-input { border: none !important; border-bottom: 1px solid #e5e5e5 !important; border-radius: 0 !important; background-color: transparent !important; box-shadow: none !important; outline: none !important; transition: border-bottom-color 0.3s ease !important; }
                .minimal-input:focus { border-bottom-color: #111 !important; }
                .floating-label { position: absolute; left: 0; top: 10px; font-size: 0.875rem; color: #9ca3af; transition: transform 0.3s ease, color 0.3s ease; pointer-events: none; }
                .minimal-input:focus~.floating-label, .minimal-input:not(:placeholder-shown)~.floating-label { transform: translateY(-120%) scale(0.85); color: #111; transform-origin: left top; }
                .fade-in { animation: fadeIn 0.4s ease-in-out forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .mode-hidden { display: none !important; }
                .custom-scrollbar-02::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar-02::-webkit-scrollbar-thumb { background: #e5e5e5; border-radius: 4px; }
                
                .bg-kakao { background-color: #FEE500; color: #191919; }
                .bg-naver { background-color: #03C75A; color: #ffffff; }
                .bg-facebook { background-color: #1877F2; color: #ffffff; }
                .bg-line { background-color: #06C755; color: #ffffff; }
                .bg-apple { background-color: #000000; color: #ffffff; }
                .bg-yahoojp { background-color: #FF0033; color: #ffffff; }
                .sns-grid-btn { display: flex; align-items: center; justify-content: center; padding: 0.625rem; font-size: 0.8125rem; font-weight: 500; border-radius: 0.25rem; transition: opacity 0.2s ease; width: 100%; }
                .sns-grid-btn:hover { opacity: 0.85; }

                .ykinas-loader-overlay { position: fixed; inset: 0; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(8px); z-index: 2147483647; display: none; align-items: center; justify-content: center; flex-direction: column; transition: opacity 0.3s ease; }
                .ykinas-spinner { width: 44px; height: 44px; border: 3px solid rgba(0, 0, 0, 0.05); border-radius: 50%; border-top-color: #111; animation: ykinas-spin 0.8s linear infinite; }
                @keyframes ykinas-spin { to { transform: rotate(360deg); } }
                .ykinas-loader-text { margin-top: 16px; font-size: 13px; font-weight: 600; color: #111; letter-spacing: 0.05em; animation: pulse 1.5s infinite; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
              </style>

              <div id="ykinas-global-loader" class="ykinas-loader-overlay">
                <div class="ykinas-spinner"></div>
                <div class="ykinas-loader-text">잠시만 기다려주세요</div>
              </div>

              <div class="fixed inset-0 z-[99999] flex bg-[#faf9f8] overflow-hidden fade-in" style="font-family: 'Pretendard', 'Noto Sans KR', sans-serif;">
                <div class="hidden lg:block lg:w-7/12 relative bg-gray-900">
                  <img src="\${heroImage}" alt="Brand Editorial" class="w-full h-full object-cover opacity-90" onerror="this.src='https://via.placeholder.com/1200x800/111/333?text=Brand+Image'" />
                  <div class="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
                  <button type="button" id="a_btn_back_shop" class="absolute top-10 left-10 !bg-transparent text-white hover:opacity-70 transition-opacity flex items-center gap-2 z-10 cursor-pointer">
                    <span class="text-xs tracking-widest uppercase font-medium">← Back to Shop</span>
                  </button>
                  <div class="absolute bottom-20 left-16 text-white max-w-lg">
                    <span class="text-xs uppercase tracking-[0.3em] opacity-80 mb-2 block font-sans">\${subTitle}</span>
                    <h2 class="text-5xl font-serif tracking-wide mb-4 leading-tight">\${mainTitle}</h2>
                    <p class="text-sm tracking-wide font-light opacity-80 leading-relaxed">\${descTxt}</p>
                  </div>
                </div>

                <div class="w-full lg:w-5/12 bg-white shadow-2xl z-10 flex flex-col relative custom-scrollbar-02 overflow-y-auto" id="standalone_panel">
                  <button type="button" id="a_btn_close" class="absolute top-6 right-6 p-2 text-gray-400 !bg-transparent hover:bg-gray-100 hover:text-black rounded-full transition-colors z-[100] text-xl">✕</button>

                  <div class="px-8 sm:px-14 pt-24 pb-12 flex-1 flex flex-col justify-center">
                    <div class="w-full max-w-sm mx-auto relative">
                      
                      <!-- [모드 A] 회원 로그인 UI -->
                      <div id="ui-login-mode" class="fade-in">
                        <div class="mb-10">
                          <h1 class="text-2xl font-bold tracking-tight text-gray-900 mb-2">로그인</h1>
                          <p class="text-sm text-gray-500">SNS 간편 로그인 또는 아이디로 접속하세요.</p>
                        </div>

                        <!-- SNS 연동 영역 -->
                        <div class="space-y-2 mb-6">
                          <button type="button" id="a_sns_kakao" class="w-full flex items-center justify-center py-3 bg-kakao text-sm font-semibold rounded hover:opacity-90 transition-opacity" style="display:none;">
                            <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.6-.2.8-1 3.5-1 3.6 0 .1.1.2.3.2.1 0 .2 0 .3-.1.6-.4 4.3-2.9 5-3.3.7.1 1.3.1 2 .1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"/></svg>
                            카카오로 시작하기
                          </button>
                          
                          <div id="a_sns_grid_container" class="grid grid-cols-2 gap-2" style="display:none;">
                            <button type="button" id="a_sns_naver" class="sns-grid-btn bg-naver" style="display:none;">
                              <span class="w-4 h-4 flex items-center justify-center font-bold text-[10px] mr-1">N</span> 네이버
                            </button>
                            <button type="button" id="a_sns_google" class="sns-grid-btn bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" style="display:none;">
                              <svg class="w-4 h-4 mr-1.5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                              구글
                            </button>
                            <button type="button" id="a_sns_apple" class="sns-grid-btn bg-apple" style="display:none;">
                              <svg class="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 384 512"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-96.2 20.7-22 0-53-22.9-86-22.9-49.8 0-96.3 35.6-122 85.7-52.7 101.4-13.8 247.9 36.6 320.1 24.3 34.6 52.8 70.9 88.5 69.4 34.6-1.5 48.7-22.4 90.4-22.4 41.7 0 53.6 22.4 90.1 22.4 37.9 0 62.7-32.9 86.8-68.5 16-23.7 22.7-47 23.3-48.5-1.1-.5-45.7-17-45.9-66.6zM245.9 64.6c20.5-24.8 34.3-59.5 30.6-94.6-29.5 1.2-65.7 19.8-87.3 44.8-17.7 20.5-33.8 55.7-29.4 89.8 33.3 2.6 65.5-15.2 86.1-40z"/></svg>
                              Apple
                            </button>
                            <button type="button" id="a_sns_facebook" class="sns-grid-btn bg-facebook" style="display:none;">
                              <svg class="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 320 512"><path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"/></svg>
                              Facebook
                            </button>
                            <button type="button" id="a_sns_line" class="sns-grid-btn bg-line" style="display:none;">
                              <span class="font-bold text-[11px] mr-1 tracking-wider">LINE</span> 라인
                            </button>
                            <button type="button" id="a_sns_yahoojp" class="sns-grid-btn bg-yahoojp" style="display:none;">
                              <span class="font-bold text-[12px] italic mr-1">Y!</span> Yahoo
                            </button>
                          </div>
                        </div>

                        <div class="relative flex items-center py-4">
                          <div class="flex-grow border-t border-gray-200"></div>
                          <span class="flex-shrink-0 mx-4 text-[11px] text-gray-400">또는 아이디로 로그인</span>
                          <div class="flex-grow border-t border-gray-200"></div>
                        </div>

                        <div class="space-y-4 mt-5">
                          <div class="relative w-full">
                            <input type="text" id="a_id" placeholder=" " required autocomplete="username" class="minimal-input w-full py-2.5 text-sm text-gray-900" />
                            <label class="floating-label">아이디</label>
                          </div>
                          <div class="relative w-full">
                            <input type="password" id="a_pw" placeholder=" " required autocomplete="current-password" class="minimal-input w-full py-2.5 text-sm text-gray-900 pr-8" />
                            <label class="floating-label">비밀번호</label>
                            <button type="button" id="a_btn_toggle_pw" class="absolute right-0 top-2.5 text-gray-400 hover:text-black transition-colors p-0.5">👁</button>
                          </div>
                          <div class="flex items-center justify-between mt-2 mb-4">
                            <label class="flex items-center cursor-pointer group">
                              <input type="checkbox" id="a_save_id" class="w-3.5 h-3.5 text-black border-gray-300 rounded focus:ring-black cursor-pointer" checked>
                              <span class="ml-2 text-xs text-gray-500 group-hover:text-black transition-colors">보안 접속</span>
                            </label>
                          </div>
                          <button type="button" id="a_btn_submit_login" class="w-full py-4 bg-black text-white text-sm font-semibold tracking-widest hover:bg-gray-800 transition-colors mt-4 rounded shadow-md active:scale-[0.99] transform">로그인</button>
                        </div>

                        <div class="flex justify-center items-center space-x-4 mt-6 text-xs text-gray-500">
                          <a href="/member/id/find_id.html" class="hover:text-black transition-colors">아이디 찾기</a><span class="w-px h-3 bg-gray-300"></span>
                          <a href="/member/passwd/find_passwd_info.html" class="hover:text-black transition-colors">비밀번호 찾기</a><span class="w-px h-3 bg-gray-300"></span>
                          <a href="/member/agreement.html" class="font-bold text-black border-b border-black pb-0.5">회원가입</a>
                        </div>

                        <div class="mt-12 text-center border-t border-gray-100 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))] lg:pb-6">
                          <button type="button" id="a_btn_goto_guest" class="p-2 text-xs text-gray-400 hover:text-black underline underline-offset-4 transition-colors active:opacity-70">
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
                            <input type="text" id="a_order_name" placeholder=" " autocomplete="off" class="minimal-input w-full py-2.5 text-sm text-gray-900" />
                            <label class="floating-label">주문자명</label>
                          </div>
                          <div class="relative w-full">
                            <input type="text" id="a_order_id" placeholder=" " autocomplete="off" class="minimal-input w-full py-2.5 text-sm text-gray-900" />
                            <label class="floating-label">주문번호 (하이픈 포함)</label>
                          </div>
                          <div class="relative w-full">
                            <input type="password" id="a_order_pw" placeholder=" " autocomplete="off" class="minimal-input w-full py-2.5 text-sm text-gray-900 pr-8" />
                            <label class="floating-label">주문 비밀번호</label>
                            <button type="button" id="a_btn_toggle_order_pw" class="absolute right-0 top-2.5 text-gray-400 hover:text-black transition-colors">👁</button>
                          </div>
                          <button type="button" id="a_btn_submit_guest" class="w-full py-4 bg-white border border-black text-black text-sm font-semibold tracking-widest hover:bg-black hover:text-white transition-colors mt-4 rounded shadow-sm">주문 추적하기</button>
                        </div>

                        <div class="mt-12 text-center border-t border-gray-100 pt-6">
                          <button type="button" id="a_btn_goto_login" class="text-xs text-gray-400 hover:text-black underline underline-offset-4 transition-colors">회원 로그인으로 돌아가기</button>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            \`;

            document.body.insertAdjacentHTML('beforeend', fullScreenHTML);

            // ==========================================
            // 로직 바인딩 및 라우팅 컨트롤
            // ==========================================
            const showLoader = () => {
              const loader = document.getElementById('ykinas-global-loader');
              if (loader) loader.style.display = 'flex';
            };
            const hideLoader = () => {
              const loader = document.getElementById('ykinas-global-loader');
              if (loader) loader.style.display = 'none';
            };

            const closeHandler = (e) => {
              hideLoader(); 
              if (e) e.preventDefault();
              if (document.referrer && document.referrer.includes(location.host)) {
                window.history.back();
              } else {
                window.location.href = '/';
              }
            };
            document.getElementById('a_btn_close').addEventListener('click', closeHandler);
            document.getElementById('a_btn_back_shop').addEventListener('click', closeHandler);

            const switchMode = (mode) => {
              const loginMode = document.getElementById('ui-login-mode');
              const guestMode = document.getElementById('ui-guest-mode');
              const panel = document.getElementById('standalone_panel');
              if (mode === 'guest') {
                loginMode.classList.add('mode-hidden');
                guestMode.classList.remove('mode-hidden');
              } else {
                guestMode.classList.add('mode-hidden');
                loginMode.classList.remove('mode-hidden');
              }
              if (panel) panel.scrollTop = 0;
            };

            document.getElementById('a_btn_goto_guest').addEventListener('click', () => {
              showLoader();
              window.location.replace('/member/login.html?noMemberOrder&returnUrl=' + encodeURIComponent('/myshop/order/list.html'));
            });
            document.getElementById('a_btn_goto_login').addEventListener('click', () => {
              showLoader();
              window.location.replace('/member/login.html');
            });

            document.getElementById('a_btn_toggle_pw').addEventListener('click', () => {
              const pw = document.getElementById('a_pw');
              pw.type = pw.type === 'password' ? 'text' : 'password';
            });
            document.getElementById('a_btn_toggle_order_pw').addEventListener('click', () => {
              const opw = document.getElementById('a_order_pw');
              opw.type = opw.type === 'password' ? 'text' : 'password';
            });

            const submitLogin = () => {
              const idVal = document.getElementById('a_id').value.trim();
              const pwVal = document.getElementById('a_pw').value.trim();
              if (!idVal || !pwVal) return alert("아이디와 비밀번호를 모두 입력해주세요.");
              const wrap = document.getElementById('cafe24-original-wrap');
              if (wrap) {
                showLoader();
                wrap.querySelector('input[name="member_id"]').value = idVal;
                wrap.querySelector('input[name="member_passwd"]').value = pwVal;
                document.getElementById('origin_btn_login')?.click();
              }
            };
            document.getElementById('a_btn_submit_login').addEventListener('click', submitLogin);
            document.getElementById('a_pw').addEventListener('keypress', (e) => { if (e.key === 'Enter') submitLogin(); });

            const submitGuest = () => {
              const nameVal = document.getElementById('a_order_name').value.trim();
              const idVal = document.getElementById('a_order_id').value.trim();
              const pwVal = document.getElementById('a_order_pw').value.trim();
              if (!nameVal || !idVal || !pwVal) return alert("주문자 정보를 모두 입력해주세요.");
              const wrap = document.getElementById('cafe24-original-wrap');
              if (wrap) {
                showLoader();
                wrap.querySelector('input[name="order_name"]').value = nameVal;
                wrap.querySelector('input[name="order_id"]').value = idVal;
                wrap.querySelector('input[name="order_password"]').value = pwVal;
                document.getElementById('origin_btn_order_history')?.click();
              }
            };
            document.getElementById('a_btn_submit_guest').addEventListener('click', submitGuest);
            document.getElementById('a_order_pw').addEventListener('keypress', (e) => { if (e.key === 'Enter') submitGuest(); });

            // [핵심] SNS 오버레이 (Clickjacking) 기술 적용 - 모바일 Intent 차단 완벽 우회
            const syncSnsA = () => {
              const snsProviders = ['kakao', 'naver', 'google', 'apple', 'facebook', 'line', 'yahoojp'];
              let gridActiveCount = 0;

              snsProviders.forEach(key => {
                const customBtn = document.getElementById('a_sns_' + key);
                if (!customBtn) return;

                let originEl = document.getElementById('origin_btn_' + key);
                if (!originEl) {
                  const className = key === 'yahoojp' ? '.yahoojp' : '.btn' + key.charAt(0).toUpperCase() + key.slice(1);
                  originEl = document.querySelector(className);
                }

                if (originEl) {
                  const isHidden = originEl.classList.contains('displaynone') || (originEl.style && originEl.style.display === 'none');
                  if (isHidden) {
                    customBtn.style.display = 'none';
                  } else {
                    customBtn.style.display = 'flex';
                    customBtn.style.position = 'relative'; // 자식의 absolute 포지셔닝을 위한 부모 세팅
                    
                    // [해결] 원본 카페24 버튼을 우리 버튼 내부로 이동시켜 투명하게 덮어버림
                    originEl.style.setProperty('position', 'absolute', 'important');
                    originEl.style.setProperty('top', '0', 'important');
                    originEl.style.setProperty('left', '0', 'important');
                    originEl.style.setProperty('width', '100%', 'important');
                    originEl.style.setProperty('height', '100%', 'important');
                    originEl.style.setProperty('opacity', '0', 'important');
                    originEl.style.setProperty('z-index', '10', 'important');
                    originEl.style.setProperty('cursor', 'pointer', 'important');
                    originEl.style.setProperty('display', 'block', 'important');
                    originEl.style.setProperty('color', 'transparent', 'important');
                    originEl.style.setProperty('font-size', '0', 'important');
                    
                    if (originEl.parentNode !== customBtn) {
                      customBtn.appendChild(originEl);
                    }

                    if (key !== 'kakao') gridActiveCount++;
                  }
                } else {
                  customBtn.style.display = 'none'; 
                }
              });

              const gridContainer = document.getElementById('a_sns_grid_container');
              if (gridContainer) {
                gridContainer.style.display = gridActiveCount > 0 ? 'grid' : 'none';
              }
            };
            
            syncSnsA();
            window.addEventListener('load', syncSnsA);
            let snsIntervalA = setInterval(syncSnsA, 300);
            setTimeout(() => clearInterval(snsIntervalA), 3000);

            const observer = new MutationObserver(() => syncSnsA());
            observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['class', 'style'] });

            const searchStr = window.location.search;
            const returnUrl = new URLSearchParams(searchStr).get('returnUrl') || '';
            if (searchStr.includes('noMemberOrder') || returnUrl.includes('order/list.html')) {
              switchMode('guest');
            } else {
              switchMode('login');
            }
          }

          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', renderFullScreenUI);
          } else {
            renderFullScreenUI();
          }

        } else {
          // ==========================================
          // [MODE B] 글로벌 드로어 (Global Login Drawer)
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

          let drawer = null;
          let backdrop = null;
          let panel = null;
          let isInitialized = false;

          const hideDrawerLoader = () => {
            if (ykinasShadowRoot) {
              const loader = ykinasShadowRoot.querySelector('#ykinas-drawer-loader');
              if (loader) loader.style.display = 'none';
            }
          };

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
              hideDrawerLoader(); 
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

            ykinasShadowRoot = host.attachShadow({ mode: 'closed' });

            ykinasShadowRoot.innerHTML = \`
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

                /* 드로어 전용 로딩 오버레이 */
                .ykinas-loader-overlay { position: absolute; inset: 0; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(8px); z-index: 2147483647; display: none; align-items: center; justify-content: center; flex-direction: column; transition: opacity 0.3s ease; }
                .ykinas-spinner { width: 44px; height: 44px; border: 3px solid rgba(0, 0, 0, 0.05); border-radius: 50%; border-top-color: #111; animation: ykinas-spin 0.8s linear infinite; }
                @keyframes ykinas-spin { to { transform: rotate(360deg); } }
                .ykinas-loader-text { margin-top: 16px; font-size: 13px; font-weight: 600; color: #111; letter-spacing: 0.05em; animation: pulse 1.5s infinite; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
              </style>

              <div id="global-login-drawer">
                <div id="login-backdrop"></div>
                <div id="login-panel" class="custom-scrollbar-02">
                  <div id="ykinas-drawer-loader" class="ykinas-loader-overlay">
                    <div class="ykinas-spinner"></div>
                    <div class="ykinas-loader-text">안전하게 통신 중입니다</div>
                  </div>

                  <button type="button" id="btn_close_drawer" class="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors z-50">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  
                  <div class="px-8 sm:px-10 py-16 flex-1 flex flex-col justify-center drawer-content-wrapper">
                    <div id="ui-login-mode">
                      <h2 class="text-2xl font-bold tracking-tight text-gray-900 mb-2">로그인</h2>
                      <p class="text-sm text-gray-500 mb-8">SNS 간편 로그인 또는 아이디로 편리하게 접속하세요.</p>
                      
                      <div class="space-y-2 mb-6">
                        <button type="button" id="btn_sns_kakao" class="w-full flex items-center justify-center py-3 bg-kakao text-sm font-semibold rounded hover:opacity-90 transition-opacity" style="display:none;">
                          <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.6-.2.8-1 3.5-1 3.6 0 .1.1.2.3.2.1 0 .2 0 .3-.1.6-.4 4.3-2.9 5-3.3.7.1 1.3.1 2 .1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z" /></svg>
                          카카오로 시작하기
                        </button>
                        
                        <div id="b_sns_grid_container" class="grid grid-cols-2 gap-2" style="display:none;">
                          <button type="button" id="btn_sns_naver" class="sns-grid-btn bg-naver" style="display:none;">
                            <span class="w-4 h-4 flex items-center justify-center font-bold text-[10px] mr-1">N</span> 네이버
                          </button>
                          <button type="button" id="btn_sns_google" class="sns-grid-btn bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" style="display:none;">
                            <svg class="w-4 h-4 mr-1.5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                            구글
                          </button>
                          <button type="button" id="btn_sns_apple" class="sns-grid-btn bg-apple" style="display:none;">
                            <svg class="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 384 512"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-96.2 20.7-22 0-53-22.9-86-22.9-49.8 0-96.3 35.6-122 85.7-52.7 101.4-13.8 247.9 36.6 320.1 24.3 34.6 52.8 70.9 88.5 69.4 34.6-1.5 48.7-22.4 90.4-22.4 41.7 0 53.6 22.4 90.1 22.4 37.9 0 62.7-32.9 86.8-68.5 16-23.7 22.7-47 23.3-48.5-1.1-.5-45.7-17-45.9-66.6zM245.9 64.6c20.5-24.8 34.3-59.5 30.6-94.6-29.5 1.2-65.7 19.8-87.3 44.8-17.7 20.5-33.8 55.7-29.4 89.8 33.3 2.6 65.5-15.2 86.1-40z"/></svg>
                            Apple
                          </button>
                          <button type="button" id="btn_sns_facebook" class="sns-grid-btn bg-facebook" style="display:none;">
                            <svg class="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 320 512"><path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"/></svg>
                            Facebook
                          </button>
                          <button type="button" id="btn_sns_line" class="sns-grid-btn bg-line" style="display:none;">
                            <span class="font-bold text-[11px] mr-1 tracking-wider">LINE</span> 라인
                          </button>
                          <button type="button" id="btn_sns_yahoojp" class="sns-grid-btn bg-yahoojp" style="display:none;">
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

            ykinasShadowRoot.querySelector('#btn_close_drawer').addEventListener('click', window.YkinasLogin.close);
            ykinasShadowRoot.querySelector('#login-backdrop').addEventListener('click', window.YkinasLogin.close);

            const showDrawerLoader = () => {
              const loader = ykinasShadowRoot.querySelector('#ykinas-drawer-loader');
              if (loader) loader.style.display = 'flex';
            };

            if (skinPrefix) {
              const allLinks = ykinasShadowRoot.querySelectorAll('a');
              allLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('/')) {
                  link.setAttribute('href', skinPrefix + href);
                }
              });
            }

            ykinasShadowRoot.querySelector('#btn_toggle_pw').addEventListener('click', function() {
              const pw = ykinasShadowRoot.querySelector('#s_pw');
              pw.type = pw.type === 'password' ? 'text' : 'password';
            });

            ykinasShadowRoot.querySelector('#btn_submit_login').addEventListener('click', function() {
               const idVal = ykinasShadowRoot.querySelector('#s_id').value.trim();
               const pwVal = ykinasShadowRoot.querySelector('#s_pw').value.trim();
               if (!idVal || !pwVal) { 
                 alert("아이디와 비밀번호를 모두 입력해주세요."); 
                 return; 
               }
               
               const originWrapInner = document.getElementById('hidden-cafe24-login-module') || document.getElementById('cafe24-original-wrap');
               if (originWrapInner && originWrapInner.querySelector('input[name="member_id"]')) { 
                 showDrawerLoader();
                 originWrapInner.querySelector('input[name="member_id"]').value = idVal; 
                 originWrapInner.querySelector('input[name="member_passwd"]').value = pwVal; 
                 (document.getElementById('hidden_btn_login') || document.getElementById('origin_btn_login')).click(); 
               } else {
                 try {
                   showDrawerLoader();
                   const iframe = document.getElementById('ykinas_proxy_iframe');
                   const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                   
                   iframe.contentWindow.alert = function(msg) {
                     window.alert(msg);
                   };

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

            // [해결] 드로어(Mode B) SNS 다이렉트 라우팅 (모바일 환경 팝업/Intent 차단 완벽 회피)
            function executeDirectSnsLoginB(provider) {
              try {
                const rawUrl = window.location.pathname + window.location.search;
                const safeReturnUrl = encodeURIComponent(decodeURIComponent(rawUrl));
                const providerMap = { kakao: 'Kakao', naver: 'Naver', google: 'Google', facebook: 'Facebook', line: 'Line', apple: 'Apple', yahoojp: 'Yahoojp' };
                const pName = providerMap[provider];
                
                const authUrl = '/Api/Member/Oauth2Client/' + pName + '/?returnUrl=' + safeReturnUrl;
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                
                if (isMobile) {
                  window.location.href = authUrl; // 모바일은 팝업 차단 회피를 위해 창 이동
                } else {
                  const snsPopup = window.open(authUrl, 'snsLoginPopup', 'width=500,height=600,scrollbars=yes');
                  if (!snsPopup || snsPopup.closed || typeof snsPopup.closed === 'undefined') {
                     window.location.href = authUrl;
                  }
                }
              } catch (error) {
                console.error('[YKINAS SNS Login Error]:', error);
              }
            }

            ['kakao', 'naver', 'google', 'apple', 'facebook', 'line', 'yahoojp'].forEach(provider => {
              const btn = ykinasShadowRoot.querySelector('#btn_sns_' + provider);
              if (btn) btn.addEventListener('click', () => executeDirectSnsLoginB(provider));
            });

            const syncRealtimeSnsVisibility = () => {
              const snsProviders = ['kakao', 'naver', 'google', 'apple', 'facebook', 'line', 'yahoojp'];
              
              const syncDisplay = (sourceDoc) => {
                if (!sourceDoc) return;
                let gridActiveCount = 0;

                snsProviders.forEach(key => {
                  let originEl = sourceDoc.querySelector('#origin_btn_' + key);
                  if (!originEl) {
                    const className = key === 'yahoojp' ? '.yahoojp' : '.btn' + key.charAt(0).toUpperCase() + key.slice(1);
                    originEl = sourceDoc.querySelector(className);
                  }
                  
                  const shadowBtn = ykinasShadowRoot.querySelector('#btn_sns_' + key);
                  if (shadowBtn && originEl) {
                    const isHidden = originEl.classList.contains('displaynone') || (originEl.style && originEl.style.display === 'none');
                    if (isHidden) {
                      shadowBtn.style.display = 'none';
                    } else {
                      shadowBtn.style.display = 'flex';
                      if (key !== 'kakao') gridActiveCount++;
                    }
                  } else if (shadowBtn && !originEl) {
                    shadowBtn.style.display = 'none';
                  }
                });

                const gridContainer = ykinasShadowRoot.querySelector('#b_sns_grid_container');
                if (gridContainer) {
                  gridContainer.style.display = gridActiveCount > 0 ? 'grid' : 'none';
                }
              };

              const localWrap = document.getElementById('hidden-cafe24-login-module') || document.getElementById('cafe24-original-wrap');
              if (localWrap) syncDisplay(localWrap);

              const iframeNode = document.getElementById('ykinas_proxy_iframe');
              if (iframeNode) {
                iframeNode.addEventListener('load', () => {
                  try { 
                    const iframeDoc = iframeNode.contentDocument || iframeNode.contentWindow.document;
                    syncDisplay(iframeDoc); 
                    const observer = new MutationObserver(() => syncDisplay(iframeDoc));
                    observer.observe(iframeDoc.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['class', 'style'] });
                  } catch (e) {}
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