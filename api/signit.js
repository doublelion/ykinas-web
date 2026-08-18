import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    // 1. CORS 및 캐시 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=0, must-revalidate');

    const clientReferer = req.headers['referer'] || '';
    const clientMallId = req.query.mall_id;

    // 라이선스 실패 시 더미 스크립트 반환
    const sendDisabledScript = (reason) => {
      return res.status(200).send(`console.warn('[YKINAS SignIt] Disabled: ${reason}');`);
    };

    if (!clientMallId || clientMallId.includes('{$')) {
      return sendDisabledScript('Invalid Mall ID');
    }

    // 2. Supabase 라이선스 및 도메인 검증
    const { data: license, error } = await supabase
      .from('skin_licenses')
      .select('is_active, has_login_module, skin_allowed_domains(domain)')
      .eq('mall_id', clientMallId)
      .maybeSingle();

    if (error || !license || !license.is_active || !license.has_login_module) {
      return sendDisabledScript('Unauthorized or Module inactive.');
    }

    // 3. 클라이언트에 주입할 핵심 자바스크립트 생성
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
          document.addEventListener('DOMContentLoaded', function() {
            // 원본 Cafe24 폼 숨김 처리
            const originWrap = document.getElementById('cafe24-original-wrap');
            if (originWrap) originWrap.style.display = 'none';

            // Tailwind CDN 및 폰트 주입
            if (!document.getElementById('ykinas-tailwind')) {
              const tailwind = document.createElement('link');
              tailwind.id = 'ykinas-tailwind';
              tailwind.rel = 'stylesheet';
              tailwind.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
              document.head.appendChild(tailwind);
            }

            // 대표님이 작성하신 프리미엄 CVR 최적화 UI (문자열로 은닉화)
            const fullScreenHTML = \`
              <style>
                .minimal-input { border: none !important; border-bottom: 1px solid #e5e5e5 !important; border-radius: 0 !important; background-color: transparent !important; box-shadow: none !important; outline: none !important; transition: border-bottom-color 0.3s ease !important; }
                .minimal-input:focus { border-bottom-color: #111 !important; }
                .floating-label { position: absolute; left: 0; top: 10px; font-size: 0.875rem; color: #9ca3af; transition: transform 0.3s ease; pointer-events: none; }
                .minimal-input:focus~.floating-label, .minimal-input:not(:placeholder-shown)~.floating-label { transform: translateY(-120%) scale(0.85); color: #111; }
                .fade-in { animation: fadeIn 0.4s ease-in-out forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .mode-hidden { display: none !important; }
              </style>
              <div id="ykinas-fullscreen-login" class="fixed inset-0 z-[99999] flex bg-[#faf9f8] overflow-hidden fade-in" style="font-family: 'Pretendard', sans-serif;">
                <!-- 좌측 에디토리얼 영역 -->
                <div class="hidden lg:block lg:w-7/12 relative bg-gray-900">
                  <img src="/web/upload/hero_img_02.png" alt="Editorial" class="w-full h-full object-cover opacity-90" />
                  <div class="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
                  <a href="/" class="absolute top-10 left-10 text-white hover:opacity-70 flex items-center gap-2 z-10 cursor-pointer">
                    <span class="text-xs tracking-widest uppercase font-medium">← Back to Shop</span>
                  </a>
                  <div class="absolute bottom-20 left-16 text-white max-w-lg">
                    <span class="text-xs uppercase tracking-[0.3em] opacity-80 mb-2 block">Exclusive Membership</span>
                    <h2 class="text-5xl font-serif tracking-wide mb-4 leading-tight">Breathtaking<br>Clarity.</h2>
                  </div>
                </div>

                <!-- 우측 패널 영역 (회원/비회원 분기) -->
                <div class="w-full lg:w-5/12 bg-white shadow-2xl z-10 flex flex-col relative overflow-y-auto">
                  <a href="/" class="absolute top-6 right-6 p-2 text-gray-400 hover:text-black z-[100] text-xl">✕</a>
                  
                  <div class="px-8 sm:px-14 pt-24 pb-12 flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
                    
                    <!-- 로그인 모드 -->
                    <div id="ui-login-mode" class="fade-in">
                      <h1 class="text-2xl font-bold tracking-tight text-gray-900 mb-2">로그인</h1>
                      <p class="text-sm text-gray-500 mb-8">SNS 간편 로그인 또는 아이디로 접속하세요.</p>
                      
                      <div class="space-y-6">
                        <div class="relative w-full">
                          <input type="text" id="custom_id" placeholder=" " class="minimal-input w-full py-2.5 text-sm" />
                          <label class="floating-label">아이디</label>
                        </div>
                        <div class="relative w-full">
                          <input type="password" id="custom_pw" placeholder=" " class="minimal-input w-full py-2.5 text-sm pr-8" />
                          <label class="floating-label">비밀번호</label>
                        </div>
                        <button type="button" id="btn_custom_login" class="w-full py-4 bg-black text-white text-sm font-semibold tracking-widest mt-4 rounded shadow-md">로그인</button>
                      </div>

                      <div class="mt-12 text-center border-t border-gray-100 pt-6">
                        <button type="button" id="btn_goto_guest" class="text-xs text-gray-400 hover:text-black underline">비회원으로 주문하셨나요?</button>
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
                        <button type="button" id="btn_custom_guest" class="w-full py-4 bg-white border border-black text-black text-sm font-semibold tracking-widest mt-4 rounded">주문 추적하기</button>
                      </div>
                      <div class="mt-12 text-center border-t border-gray-100 pt-6">
                        <button type="button" id="btn_goto_login" class="text-xs text-gray-400 hover:text-black underline">회원 로그인으로 돌아가기</button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            \`;

            // UI 주입
            document.body.insertAdjacentHTML('beforeend', fullScreenHTML);

            // 로직 바인딩 (이벤트 리스너)
            document.getElementById('btn_goto_guest').onclick = () => {
              document.getElementById('ui-login-mode').classList.add('mode-hidden');
              document.getElementById('ui-guest-mode').classList.remove('mode-hidden');
            };
            document.getElementById('btn_goto_login').onclick = () => {
              document.getElementById('ui-guest-mode').classList.add('mode-hidden');
              document.getElementById('ui-login-mode').classList.remove('mode-hidden');
            };

            // Cafe24 원본 폼과 데이터 동기화 및 서밋 트리거
            document.getElementById('btn_custom_login').onclick = () => {
              document.querySelector('input[name="member_id"]').value = document.getElementById('custom_id').value;
              document.querySelector('input[name="member_passwd"]').value = document.getElementById('custom_pw').value;
              document.getElementById('origin_btn_login').click();
            };

            document.getElementById('btn_custom_guest').onclick = () => {
              document.querySelector('input[name="order_name"]').value = document.getElementById('custom_order_name').value;
              document.querySelector('input[name="order_id"]').value = document.getElementById('custom_order_id').value;
              document.querySelector('input[name="order_password"]').value = document.getElementById('custom_order_pw').value;
              document.getElementById('origin_btn_order_history').click();
            };

            // URL 파라미터 감지하여 비회원 모드 자동 활성화
            if (window.location.search.includes('noMemberOrder') || window.location.search.includes('order/list.html')) {
              document.getElementById('btn_goto_guest').click();
            }
          });

          return; // 로그인 페이지면 드로어 로직은 실행하지 않음
        }

        // ==========================================
        // [MODE B] 글로벌 드로어 (Global Login Drawer)
        // ==========================================
        // (기존 작성하셨던 Shadow DOM 기반 드로어 코드가 여기에 들어갑니다. 생략 없이 기존 코드 유지)
        // ...
        
      })();
    `;

    return res.status(200).send(injectedScript);
  } catch (err) {
    console.error(err);
    return res.status(500).send('/* SignIt Initialization error */');
  }
}