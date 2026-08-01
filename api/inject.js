import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  const clientReferer = req.headers['referer'] || '';
  const clientMallId = req.query.mall_id || '';

  try {
    const { data: license, error } = await supabase
      .from('skin_licenses')
      .select(`id, is_active, skin_allowed_domains ( domain )`)
      .eq('mall_id', clientMallId)
      .eq('is_active', true)
      .single();

    if (error || !license) return res.status(200).send(`console.warn('[YKINAS] Unauthorized skin license.');`);

    const allowedDomains = license.skin_allowed_domains.map(d => d.domain);
    const isDomainMatch = allowedDomains.some(domain => clientReferer.includes(domain));

    if (!isDomainMatch) return res.status(200).send(`console.warn('[YKINAS] Domain verification failed.');`);

    // [핵심] 디자이너님의 GLOBAL LOGIN DRAWER를 Shadow DOM에 주입
    const injectedScript = `
      (function() {
        'use strict';
        if (window.__YKINAS_SKIN_LOADED__) return;
        window.__YKINAS_SKIN_LOADED__ = true;

        document.addEventListener("DOMContentLoaded", function() {
          // 카페24 기존 폼 숨김
          const originWrap = document.getElementById('hidden-cafe24-login-module') || document.getElementById('cafe24-original-wrap');
          if (originWrap) originWrap.style.display = 'none';

          const host = document.createElement('div');
          host.id = 'ykinas-global-drawer-root';
          document.body.appendChild(host);

          const shadow = host.attachShadow({ mode: 'closed' });

          shadow.innerHTML = \`
            <!-- Tailwind CSS CDN (Shadow DOM 내부 스타일 적용용) -->
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <!-- Phosphor Icons -->
            <link rel="stylesheet" type="text/css" href="https://unpkg.com/@phosphor-icons/web/src/regular/style.css">
            
            <style>
              :host { all: initial; font-family: 'Noto Sans KR', sans-serif; }
              * { font-family: 'Noto Sans KR', sans-serif; }
              
              .minimal-input {
                border: none !important; border-bottom: 1px solid #e5e5e5 !important; border-radius: 0 !important;
                background-color: transparent !important; box-shadow: none !important; outline: none !important;
                transition: border-bottom-color 0.3s ease !important;
              }
              .minimal-input:focus { border-bottom-color: #111 !important; }
              
              .floating-label {
                position: absolute; left: 0; top: 10px; font-size: 0.875rem; color: #9ca3af;
                transition: transform 0.3s ease, color 0.3s ease; pointer-events: none;
              }
              .minimal-input:focus ~ .floating-label, .minimal-input:not(:placeholder-shown) ~ .floating-label {
                transform: translateY(-120%) scale(0.85); color: #111; transform-origin: left top;
              }
              
              .drawer-panel { transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
              .custom-scrollbar-02::-webkit-scrollbar { width: 4px; }
              .custom-scrollbar-02::-webkit-scrollbar-thumb { background: #e5e5e5; border-radius: 4px; }
            </style>

            <div id="global-login-drawer" class="fixed inset-0 z-[9999] hidden" style="display:none;">
              <div id="login-backdrop" class="absolute inset-0 bg-black/30 backdrop-blur-sm opacity-0 transition-opacity duration-500 cursor-pointer"></div>
              <div id="login-panel" class="absolute top-0 right-0 w-full max-w-[420px] h-full bg-white shadow-2xl transform translate-x-full drawer-panel flex flex-col overflow-y-auto z-10 custom-scrollbar-02">
                <button type="button" id="btn_close_drawer" class="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors">
                  <i class="ph ph-x text-2xl"></i>
                </button>
                
                <div class="px-8 sm:px-10 py-16 flex-1 flex flex-col justify-center">
                  <h2 class="text-2xl font-bold tracking-tight text-gray-900 mb-2">로그인</h2>
                  <p class="text-sm text-gray-500 mb-10">SNS 간편 로그인 또는 아이디로 편리하게 접속하세요.</p>
                  
                  <!-- SNS 간편 로그인 -->
                  <div class="space-y-3 mb-5">
                    <button type="button" id="btn_sns_kakao" class="w-full flex items-center justify-center py-3.5 bg-[#FEE500] text-[#191919] text-sm font-semibold rounded hover:opacity-90 transition-opacity">
                      <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.6-.2.8-1 3.5-1 3.6 0 .1.1.2.3.2.1 0 .2 0 .3-.1.6-.4 4.3-2.9 5-3.3.7.1 1.3.1 2 .1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z" /></svg>
                      카카오로 3초 만에 시작하기
                    </button>
                    <div class="flex gap-2">
                      <button type="button" id="btn_sns_naver" class="flex-1 flex items-center justify-center py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors">
                        <span class="w-4 h-4 bg-[#03C75A] text-white flex items-center justify-center font-bold text-[10px] rounded mr-2">N</span>네이버
                      </button>
                      <button type="button" id="btn_sns_google" class="flex-1 flex items-center justify-center py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors">
                        <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                        구글
                      </button>
                    </div>
                  </div>

                  <div class="relative flex items-center py-1">
                    <div class="flex-grow border-t border-gray-200"></div>
                    <span class="flex-shrink-0 mx-4 text-xs text-gray-400">또는 아이디로 로그인</span>
                    <div class="flex-grow border-t border-gray-200"></div>
                  </div>
                  
                  <!-- 일반 회원 로그인 폼 -->
                  <form action="/exec/front/Member/login/" method="post" class="space-y-4 mt-5">
                    <input type="hidden" name="returnUrl" id="login_return_url" value="/">
                    <div class="relative w-full">
                      <input type="text" name="member_id" placeholder=" " required autocomplete="off" class="minimal-input w-full py-2.5 text-sm text-gray-900" />
                      <label class="floating-label">아이디</label>
                    </div>
                    <div class="relative w-full">
                      <input type="password" name="member_passwd" id="global_pw" placeholder=" " required autocomplete="off" class="minimal-input w-full py-2.5 text-sm text-gray-900 pr-8" />
                      <label class="floating-label">비밀번호</label>
                      <button type="button" id="btn_toggle_pw" class="absolute right-0 top-2.5 text-gray-400 hover:text-black"><i class="ph ph-eye text-lg"></i></button>
                    </div>
                    <div class="flex items-center justify-between mt-2 mb-4">
                      <label class="flex items-center cursor-pointer group">
                        <input type="checkbox" name="member_check_save_id" value="T" class="w-4 h-4 text-black border-gray-300 rounded focus:ring-black cursor-pointer" checked>
                        <span class="ml-2 text-xs text-gray-500 group-hover:text-black transition-colors">보안 접속</span>
                      </label>
                    </div>
                    <button type="submit" class="w-full py-4 bg-black text-white text-sm font-semibold tracking-widest hover:bg-gray-800 transition-colors rounded shadow-md">로그인</button>
                  </form>

                  <div class="flex justify-center items-center space-x-4 mt-6 text-xs text-gray-500">
                    <a href="/member/id/find_id.html" class="hover:text-black transition-colors">아이디 찾기</a><span class="w-px h-3 bg-gray-300"></span>
                    <a href="/member/passwd/find_passwd_info.html" class="hover:text-black transition-colors">비밀번호 찾기</a><span class="w-px h-3 bg-gray-300"></span>
                    <a href="/member/agreement.html" class="font-bold text-black border-b border-black pb-0.5">회원가입</a>
                  </div>

                  <!-- 비회원 주문조회 -->
                  <div class="mt-12 text-center border-t border-gray-100 pt-8">
                    <p class="text-xs text-gray-400 font-light mb-4">비회원으로 주문하셨나요?</p>
                    <a href="/member/login.html?noMemberOrder&returnUrl=%2Fmyshop%2Forder%2Flist.html" class="inline-flex items-center justify-center w-full bg-white border border-black text-black py-4 text-sm font-medium tracking-widest hover:bg-black hover:text-white transition-colors duration-300">
                      비회원 주문 조회하기
                    </a>
                  </div>
                </div>
              </div>
            </div>
          \`;

          // --- 자바스크립트 액션 바인딩 ---
          const drawer = shadow.querySelector('#global-login-drawer');
          const backdrop = shadow.querySelector('#login-backdrop');
          const panel = shadow.querySelector('#login-panel');
          const returnUrlInput = shadow.querySelector('#login_return_url');

          // 1. 글로벌 객체에 드로어 열기/닫기 리모컨 등록
          window.YkinasLogin = {
            open: function() {
              drawer.style.display = 'block';
              drawer.classList.remove('hidden');
              returnUrlInput.value = window.location.pathname + window.location.search;
              
              requestAnimationFrame(() => {
                backdrop.classList.remove('opacity-0');
                backdrop.classList.add('opacity-100');
                panel.classList.remove('translate-x-full');
              });
              document.body.style.overflow = 'hidden';
            },
            close: function() {
              backdrop.classList.remove('opacity-100');
              backdrop.classList.add('opacity-0');
              panel.classList.add('translate-x-full');
              setTimeout(() => {
                drawer.classList.add('hidden');
                drawer.style.display = 'none';
                document.body.style.overflow = '';
              }, 500);
            }
          };

          // 2. 이벤트 리스너 등록
          shadow.querySelector('#btn_close_drawer').addEventListener('click', window.YkinasLogin.close);
          backdrop.addEventListener('click', window.YkinasLogin.close);
          
          shadow.querySelector('#btn_toggle_pw').addEventListener('click', function() {
            const pwInput = shadow.querySelector('#global_pw');
            pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
          });

          // 3. SNS 로그인 대리 클릭 (카페24 순정 함수 호출)
          const currUrl = window.location.pathname + window.location.search;
          shadow.querySelector('#btn_sns_kakao').addEventListener('click', () => { if(window.MemberAction) window.MemberAction.snsLogin('kakao', currUrl); });
          shadow.querySelector('#btn_sns_naver').addEventListener('click', () => { if(window.MemberAction) window.MemberAction.snsLogin('naver', currUrl); });
          shadow.querySelector('#btn_sns_google').addEventListener('click', () => { if(window.MemberAction) window.MemberAction.snsLogin('google', currUrl); });
        });
      })();
    `;

    return res.status(200).send(injectedScript);

  } catch (err) {
    return res.status(500).send(`console.error('[YKINAS Core] Initialization error.');`);
  }
}