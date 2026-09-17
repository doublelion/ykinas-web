import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { mall_id } = req.query;

  if (!mall_id) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return res.status(200).send('console.warn("[YKINAS] mall_id is missing.");');
  }

  try {
    // 1. SUPABASE_SERVICE_ROLE_KEY 로 보정 완료
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from('skin_licenses')
      .select('modules_config')
      .eq('mall_id', mall_id)
      .single();

    if (error) throw error;
    const config = data?.modules_config?.stock_indicator || { enabled: false };

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');

    if (!config.enabled) {
      // 프론트에서 디버깅 가능하도록 로그 남김
      return res.status(200).send('console.log("[YKINAS] Stock Indicator is disabled in DB.");');
    }

    const scriptContent = `
      (function (global) {
        if (global.__YKINAS_STOCK_LOADED__) return;
        global.__YKINAS_STOCK_LOADED__ = true;
        console.log('[YKINAS] Stock Indicator Module Loaded.');

        const injectedConfig = ${JSON.stringify(config)};
        const CLIENT_ID = injectedConfig.clientId || 'YOUR_FRONT_CLIENT_ID';
        const FRONT_API_KEY = injectedConfig.frontApiKey || 'YOUR_FRONT_API_KEY'; 
        const API_VERSION = '2025-12-01'; // 보정된 최신 API 버전
        
        const STOCK_TIERS = {
          CRITICAL: { max: 3, color: '#ff6b6b', text: '품절 임박! 재고가 얼마 남지 않았습니다.', pulse: true },
          WARNING:  { max: 10, color: '#fcca23', text: '주문량 증가로 여유 재고가 소진되고 있습니다.', pulse: false }
        };

        async function fetchVariantInventory(productNo, variantCode) {
          try {
            console.log('[YKINAS] Fetching inventory for:', variantCode);
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

            if (!response.ok) throw new Error('API HTTP error: ' + response.status);
            const data = await response.json();
            console.log('[YKINAS] Inventory Qty:', data.inventory.quantity);
            return data.inventory.quantity;
          } catch (error) {
            console.error('[YKINAS] Fetch inventory error:', error);
            return null;
          }
        }

        function renderDynamicStockWidget(quantity) {
          let tier = null;
          if (quantity > 0 && quantity <= STOCK_TIERS.CRITICAL.max) tier = STOCK_TIERS.CRITICAL;
          else if (quantity > STOCK_TIERS.CRITICAL.max && quantity <= STOCK_TIERS.WARNING.max) tier = STOCK_TIERS.WARNING;
          
          const existingContainer = document.getElementById('ykinas-stock-widget-container');
          
          if (!tier) {
            console.log('[YKINAS] Sufficient stock, hiding widget.');
            if (existingContainer) existingContainer.style.display = 'none';
            return;
          }

          const targetArea = document.querySelector('.xans-product-detail .totalPrice') 
                          || document.querySelector('#totalPrice') 
                          || document.querySelector('.infoArea');
                          
          if (!targetArea) {
            console.warn('[YKINAS] Target DOM area not found for rendering.');
            return;
          }

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
          console.log('[YKINAS] Widget Rendered Successfully.');
        }

        async function initModule() {
          const productNo = window.iProductNo || document.querySelector('meta[property="product:productId"]')?.content;
          if (!productNo) {
            console.warn('[YKINAS] Product No not found.');
            return;
          }

          // [Edge Case] 단일 상품(옵션 없음)일 경우 초기 재고 로드 시도
          // 카페24의 기본 품목 코드는 대체로 000A로 끝납니다. (스킨마다 다를 수 있음 유의)
          const isOptionProduct = document.querySelector('.xans-product-option');
          if (!isOptionProduct) {
             console.log('[YKINAS] Single product detected. Fetching base variant...');
             // 기본 상품 코드 조회 시도. 실제 운영에서는 상품 상세 API로 품목코드 선행 조회가 필요할 수 있음.
             // 옵션이 없는 몰 테스트용으로, 옵션이 없다면 추가 구현이 필요합니다.
          }

          // MutationObserver: 고객이 옵션을 클릭했을 때 생성되는 DOM 엘리먼트 추적
          const priceObserver = new MutationObserver(async (mutations) => {
            // 카페24는 옵션 선택 시 내부적으로 hidden input 혹은 tr 엘리먼트를 동적 생성합니다.
            const selectedVariantInput = document.querySelector('input[name="option_box_id"], input[id^="option_box_"]'); 
            
            if (selectedVariantInput && selectedVariantInput.value) {
              const variantCode = selectedVariantInput.value; 
              // API 중복 호출 방지를 위해 체크
              if (global.__YKINAS_LAST_VARIANT__ === variantCode) return;
              global.__YKINAS_LAST_VARIANT__ = variantCode;

              const qty = await fetchVariantInventory(productNo, variantCode);
              if (qty !== null) renderDynamicStockWidget(qty);
            }
          });

          const observeTarget = document.querySelector('.xans-product-detail') || document.body;
          if (observeTarget) {
            console.log('[YKINAS] Observer attached, waiting for option selection...');
            priceObserver.observe(observeTarget, { childList: true, subtree: true, attributes: true });
          }
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initModule);
        } else {
          initModule();
        }
      })(window);
    `;

    return res.status(200).send(scriptContent);
  } catch (error) {
    console.error('[YKINAS API Error]', error);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return res.status(500).send('console.error("[YKINAS] Module load failed: ' + error.message + '");');
  }
}