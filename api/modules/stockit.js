import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { mall_id } = req.query;

  // 1. Edge Case 방어: mall_id 누락 시 클라이언트 에러를 방지하기 위해 빈 JS 반환
  if (!mall_id) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return res.status(200).send('console.warn("[YKINAS] mall_id is missing.");');
  }

  try {
    // 2. Supabase 연결 및 JSONB 모듈 설정 조회
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from('skin_licenses')
      .select('modules_config')
      .eq('mall_id', mall_id)
      .single();

    if (error) throw error;

    // 모듈 설정 추출 (기본값 false)
    const config = data?.modules_config?.stock_indicator || { enabled: false };

    // 3. 브라우저 및 CDN 캐싱 전략 (Edge Caching) - 핵심 트래픽 최적화
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');

    // 비활성화 상태면 실행 불필요 로직 즉시 반환
    if (!config.enabled) {
      return res.status(200).send('/* YKINAS Stock Indicator: Disabled */');
    }

    // 4. 프론트엔드로 전달할 클라이언트 사이드 바닐라 JS (config 변수 동적 주입)
    const scriptContent = `
      (function (global) {
        // [Idempotency] 카페24 SPA 환경 및 중복 호출 방어
        if (global.__YKINAS_STOCK_LOADED__) return;
        global.__YKINAS_STOCK_LOADED__ = true;

        // 서버(API)에서 DB 값을 읽어 직접 주입 완료된 설정 객체
        const config = ${JSON.stringify(config)};
        const bgColor = config.bgColor || '#ffe3e3';
        const textColor = config.textColor || '#fa5252';

        function renderStockWidget() {
          const targetArea = document.querySelector('.xans-product-detail') || document.querySelector('.xans-product-info');
          if (!targetArea) return;
          if (document.getElementById('ykinas-stock-widget-container')) return;

          const container = document.createElement('div');
          container.id = 'ykinas-stock-widget-container';
          
          // [Isolation] Shadow DOM: 호스트 쇼핑몰의 글로벌 CSS 오염 완벽 방지
          const shadowRoot = container.attachShadow({ mode: 'open' });
          shadowRoot.innerHTML = \`
            <style>
              .ykinas-stock-alert {
                background-color: \${bgColor};
                color: \${textColor};
                padding: 12px 16px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                text-align: center;
                margin: 20px 0;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                box-sizing: border-box;
                width: 100%;
              }
              .pulse { animation: pulse 1.5s infinite; }
              @keyframes pulse { 
                0% { opacity: 1; } 
                50% { opacity: 0.4; } 
                100% { opacity: 1; } 
              }
            </style>
            <div class="ykinas-stock-alert">
              <span class="pulse">⏳</span> 품절 임박! 현재 소량의 재고만 남아있습니다.
            </div>
          \`;
          
          targetArea.insertAdjacentElement('beforeend', container);
        }

        // [Edge Case] 카페24 동적 렌더링(비동기 옵션 로드 등) 대비 DOM 변경 감지
        const observer = new MutationObserver((mutations, obs) => {
          if (document.querySelector('.xans-product-detail')) {
            renderStockWidget();
            obs.disconnect(); 
          }
        });

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', renderStockWidget);
        } else {
          renderStockWidget();
        }
        
        // 상품 상세 DOM이 늦게 그려지는 스킨을 위해 감시 시작
        observer.observe(document.body, { childList: true, subtree: true });
      })(window);
    `;

    return res.status(200).send(scriptContent);
  } catch (error) {
    console.error('[YKINAS API Error]', error);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return res.status(500).send('console.error("[YKINAS] Failed to load module.");');
  }
}