import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');

  const clientReferer = req.headers['referer'] || '';
  let clientMallId = req.query.mall_id || '';

  // ★ [안정화 로직 유지] 카페24 템플릿 치환 실패 시 가장 확실한 폴백
  if (clientMallId === '{$mall_id}' || !clientMallId) {
    clientMallId = 'ecudemo389879';
  }

  try {
    const { data: license, error } = await supabase
      .from('skin_licenses')
      .select('id, is_active, skin_allowed_domains ( domain )')
      .eq('mall_id', clientMallId)
      .eq('is_active', true)
      .single();

    if (error || !license) return res.status(200).send(`console.warn('[YKINAS Core] Unauthorized.');`);

    const allowedDomains = license.skin_allowed_domains.map(d => d.domain);
    const isDomainMatch = allowedDomains.some(domain => clientReferer.includes(domain)) || clientReferer === '';

    if (!isDomainMatch) return res.status(200).send(`console.warn('[YKINAS Core] Domain error.');`);

    const injectedScript = `
      (function() {
        'use strict';
        
        if (window.self !== window.top) return; 

        if (window.__YKINAS_SKIN_LOADED__) return;
        window.__YKINAS_SKIN_LOADED__ = true;

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

        const currentPath = window.location.pathname;
        const currentSearch = window.location.search;
        const isLoginPage = currentPath.includes('/member/login.html');

        if (isLoginPage) {
            document.addEventListener('click', function(e) {
                const target = e.target.closest('button, a');
                if (!target) return;
                const onClickAttr = target.getAttribute('onclick') || '';
                if (onClickAttr.includes("switchMode('guest')")) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = '/member/login.html?noMemberOrder&returnUrl=%2Fmyshop%2Forder%2Flist.html';
                }
            }, true);
            return; 
        }

        const urlParams = new URLSearchParams(currentSearch);
        const targetReturnUrl = urlParams.get('returnUrl') || (currentPath + currentSearch);

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
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-label="닫기" role="button">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <div class="px-8 sm:px-10 py-16 flex-1 flex flex-col justify-center drawer-content-wrapper">
                  <div id="ui-login-mode" class="fade-in">
                    <h2 class="text-2xl font-bold tracking-tight text-gray-900 mb-2">로그인</h2>
                    <p class="text-sm text-gray-500 mb-10">SNS 간편 로그인 또는 아이디로 편리하게 접속하세요.</p>
                    
                    <div class="space-y-3 mb-5">
                      <button type="button" id="btn_sns_kakao" class="w-full flex items-center justify-center py-3.5 bg-kakao text-sm font-semibold rounded hover:opacity-90 transition-opacity">
                        <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.6-.2.8-1 3.5-1 3.6 0 .1.1.2.3.2.1 0 .2 0 .3-.1.6-.4 4.3-2.9 5-3.3.7.1 1.3.1 2 .1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z" /></svg>
                        카카오로 시작하기
                      </button>
                      <div class="flex gap-2">
                        <button type="button" id="btn_sns_naver" class="flex-1 flex items-center justify-center py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors">
                          <span class="w-4 h-4 bg-naver-icon flex items-center justify-center font-bold text-[10px] rounded mr-2">N</span>네이버
                        </button>
                        <button type="button" id="btn_sns_google" class="flex-1 flex items-center justify-center py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors">
                          <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                          구글
                        </button>
                      </div>
                    </div>

                    <div class="relative flex items-center py-2">
                      <div class="flex-grow border-t border-gray-200"></div>
                      <span class="flex-shrink-0 mx-4 text-xs text-gray-400">또는 아이디로 로그인</span>
                      <div class="flex-grow border-t border-gray-200"></div>
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
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                      <div class="flex items-center justify-between mt-2 mb-4">
                        <label class="flex items-center cursor-pointer group">
                          <input type="checkbox" id="s_save_id" class="w-4 h-4 text-black border-gray-300 rounded focus:ring-black cursor-pointer" checked>
                          <span class="ml-2 text-xs text-gray-500 group-hover:text-black transition-colors">보안 접속</span>
                        </label>
                      </div>
                      <button type="button" id="btn_submit_login" class="w-full py-4 bg-btn-primary text-sm font-semibold tracking-widest transition-colors rounded shadow-md mt-6">로그인</button>
                    </div>

                    <div class="flex justify-center items-center space-x-4 mt-6 text-xs text-gray-500">
                      <a href="/member/id/find_id.html" class="hover:text-black transition-colors">아이디 찾기</a><span class="w-px h-3 bg-gray-300"></span>
                      <a href="/member/passwd/find_passwd_info.html" class="hover:text-black transition-colors">비밀번호 찾기</a><span class="w-px h-3 bg-gray-300"></span>
                      <a href="/member/agreement.html" class="font-bold text-black border-b border-black pb-0.5">회원가입</a>
                    </div>

                    <div class="mt-12 text-center border-t border-gray-100 pt-8">
                      <p class="text-xs text-gray-400 font-light mb-4">비회원으로 주문하셨나요?</p>
                      <button type="button" id="btn_go_guest" class="inline-flex items-center justify-center w-full bg-white border border-black text-black py-4 text-sm font-medium tracking-widest hover:bg-black hover:text-white transition-colors duration-300 cursor-pointer">
                        비회원 주문 조회하기
                      </button>
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

          shadowRoot.querySelector('#btn_go_guest').addEventListener('click', function() {
            const targetUrl = skinPrefix + '/member/login.html?noMemberOrder&returnUrl=' + encodeURIComponent('/myshop/order/list.html');
            window.location.href = targetUrl;
          });

          function handleSnsLogin(provider) {
            const currUrl = window.location.pathname + window.location.search;
            
            if (window.MemberAction && typeof window.MemberAction.snsLogin === 'function') {
              window.MemberAction.snsLogin(provider, currUrl);
            } else {
              try {
                const iframe = document.getElementById('ykinas_proxy_iframe');
                if (iframe && iframe.contentWindow && typeof iframe.contentWindow.MemberAction.snsLogin === 'function') {
                  iframe.contentWindow.MemberAction.snsLogin(provider, currUrl);
                } else {
                  throw new Error("Iframe MemberAction not ready");
                }
              } catch (e) {
                const pName = provider === 'kakao' ? 'Kakao' : (provider === 'naver' ? 'Naver' : 'Google');
                window.open('/Api/Member/Oauth2Client/' + pName + '/?returnUrl=' + encodeURIComponent(currUrl), 'snsLoginPopup', 'width=500,height=500');
              }
            }
            window.YkinasLogin.close();
          }

          shadowRoot.querySelector('#btn_sns_kakao').addEventListener('click', () => handleSnsLogin('kakao'));
          shadowRoot.querySelector('#btn_sns_naver').addEventListener('click', () => handleSnsLogin('naver'));
          shadowRoot.querySelector('#btn_sns_google').addEventListener('click', () => handleSnsLogin('google'));
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
    return res.status(500).send(`console.error('[YKINAS Core] Initialization error.');`);
  }
}