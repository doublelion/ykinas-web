import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { mall_id } = req.query;

  // [Edge Case] 1. mall_id 누락 시 빈 스크립트 반환 (400 에러로 인한 프론트엔드 콘솔 에러 방지)
  if (!mall_id) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return res.status(200).send('console.warn("[YKINAS] mall_id is missing.");');
  }

  try {
    // 2. DB 설정 조회
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from('skin_licenses')
      .select('modules_config')
      .eq('mall_id', mall_id)
      .single();

    if (error) throw error;
    const config = data?.modules_config?.stock_indicator || { enabled: false };

    // 3. Edge Caching 전략 (Core Web Vitals 최적화)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');

    if (!config.enabled) {
      return res.status(200).send('/* YKINAS Stock Indicator: Disabled */');
    }

    // 4. 클라이언트 전송용 바닐라 JS (카페24 Front API 연동 및 Shadow DOM 렌더링)
    const scriptContent = `
      (function (global) {
        if (global.__YKINAS_STOCK_LOADED__) return;
        global.__YKINAS_STOCK_LOADED__ = true;

        // B2B 어드민 DB에서 주입된 설정값 (기본 미니멀 UI 폴백)
        const injectedConfig = ${JSON.stringify(config)};
        const CLIENT_ID = injectedConfig.clientId || 'YOUR_FRONT_CLIENT_ID';
        const FRONT_API_KEY = injectedConfig.frontApiKey || 'YOUR_FRONT_API_KEY'; 
        const API_VERSION = '2025-12-01'; // 카페24 권장 API 버전
        
        const STOCK_TIERS = {
          CRITICAL: { max: 3, color: '#ff6b6b', text: '품절 임박! 재고가 얼마 남지 않았습니다.', pulse: true },
          WARNING:  { max: 10, color: '#fcca23', text: '주문량 증가로 여유 재고가 소진되고 있습니다.', pulse: false }
        };

        // 재고 단건 조회 로직
        async function fetchVariantInventory(productNo, variantCode) {
          try {
            const authHeader = 'Basic ' + btoa(CLIENT_ID + ':' + FRONT_API_KEY);
            const response = await fetch('/api/v2/products/' + productNo + '/variants/' + variantCode + '/inventories', {
              method: 'GET',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'X-Cafe24-Api-Version': API_VERSION,
                'X-Cafe24-Client-Id': CLIENT_ID
              }
            });

            if (!response.ok) throw new Error('Inventory API HTTP error: ' + response.status);
            const data = await response.json();
            return data.inventory.quantity;
          } catch (error) {
            console.error('[YKINAS] Fetch inventory error:', error);
            return null;
          }
        }

        // 위젯 렌더링 로직 (Cascade Pattern 적용)
        function renderDynamicStockWidget(quantity) {
          let tier = null;
          if (quantity > 0 && quantity <= STOCK_TIERS.CRITICAL.max) tier = STOCK_TIERS.CRITICAL;
          else if (quantity > STOCK_TIERS.CRITICAL.max && quantity <= STOCK_TIERS.WARNING.max) tier = STOCK_TIERS.WARNING;
          
          const existingContainer = document.getElementById('ykinas-stock-widget-container');
          
          // 재고가 넉넉하거나(10개 초과) 품절(0개)이면 위젯을 DOM에서 숨김 (미니멀리즘)
          if (!tier) {
            if (existingContainer) existingContainer.style.display = 'none';
            return;
          }

          // 최적의 렌더링 타겟 찾기
          const targetArea = document.querySelector('.xans-product-detail .totalPrice') || document.querySelector('.infoArea');
          if (!targetArea) return;

          let container = existingContainer;
          if (!container) {
            container = document.createElement('div');
            container.id = 'ykinas-stock-widget-container';
            targetArea.insertAdjacentElement('beforebegin', container);
          }
          
          container.style.display = 'block';
          
          let shadowRoot = container.shadowRoot || container.attachShadow({ mode: 'open' });
          const pulseAnimation = tier.pulse ? 'animation: pulse 2s infinite;' : '';
          
          shadowRoot.innerHTML = \`
            <style>
              .ykinas-stock-wrapper {
                display: inline-flex; align-items: center; padding: 12px 16px;
                background-color: #fafafa; border: 1px solid #eeeeee;
                border-radius: 4px; margin: 8px 0 16px 0; width: 100%; box-sizing: border-box;
              }
              .ykinas-dot {
                width: 6px; height: 6px; background-color: \${tier.color};
                border-radius: 50%; margin-right: 12px; \${pulseAnimation}
              }
              @keyframes pulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 \${tier.color}80; }
                70% { transform: scale(1.2); box-shadow: 0 0 0 6px \${tier.color}00; }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 \${tier.color}00; }
              }
              .ykinas-text {
                font-size: 13px; color: #555555; font-family: 'Pretendard', sans-serif; letter-spacing: -0.3px;
              }
              .ykinas-qty { font-weight: 700; color: #111111; margin-left: 4px; }
            </style>
            <div class="ykinas-stock-wrapper">
              <div class="ykinas-dot"></div>
              <div class="ykinas-text">\${tier.text} <span class="ykinas-qty">(\${quantity}개)</span></div>
            </div>
          \`;
        }

        function initOptionObserver() {
          const productNo = window.iProductNo || document.querySelector('meta[property="product:productId"]')?.content;
          if (!productNo) return;

          // 옵션(가격) 영역의 돔 변경을 감지하여 선택된 품목 코드를 추출
          const priceObserver = new MutationObserver(async () => {
            const selectedVariantInput = document.querySelector('input[name="option_box_id"]'); 
            if (selectedVariantInput && selectedVariantInput.value) {
              const variantCode = selectedVariantInput.value; 
              const qty = await fetchVariantInventory(productNo, variantCode);
              if (qty !== null) renderDynamicStockWidget(qty);
            }
          });

          const priceArea = document.querySelector('.xans-product-detail');
          if (priceArea) {
            priceObserver.observe(priceArea, { childList: true, subtree: true, characterData: true });
          }
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initOptionObserver);
        } else {
          initOptionObserver();
        }
      })(window);
    `;

    return res.status(200).send(scriptContent);
  } catch (error) {
    console.error('[YKINAS API Error]', error);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return res.status(500).send('console.error("[YKINAS] Module load failed.");');
  }
}