import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { mall_id } = req.query;

  // [Edge Case] mall_id 누락 방어
  if (!mall_id) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return res.status(200).send('console.warn("[YKINAS] mall_id is missing.");');
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from('skin_licenses')
      .select('modules_config')
      .eq('mall_id', mall_id)
      .single();

    if (error) throw error;

    // DB 설정값 폴백 처리
    const config = data?.modules_config?.stock_indicator || { enabled: false };

    // [성능 최적화] Vercel Edge Cache 적용
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');

    if (!config.enabled) {
      return res.status(200).send('console.log("[YKINAS] Stock Indicator Module is disabled.");');
    }

    // SSR for JS: 클라이언트에 렌더링될 실제 바닐라 JS
    const scriptContent = `
      (function (global) {
        // [Idempotency] 중복 실행 방어
        if (global.__YKINAS_STOCK_LOADED__) return;
        global.__YKINAS_STOCK_LOADED__ = true;

        const injectedConfig = ${JSON.stringify(config)};
        const CLIENT_ID = injectedConfig.clientId || '';
        const FRONT_API_KEY = injectedConfig.frontApiKey || ''; 
        const API_VERSION = '2025-12-01'; // 최신 API 버전 고정
        const MALL_ID = '${mall_id}';
        
        // 미니멀 UI 상태 정의
        const STOCK_TIERS = {
          CRITICAL: { max: 3, color: '#ff6b6b', text: '품절 임박! 재고가 얼마 남지 않았습니다.' },
          WARNING:  { max: 10, color: '#fcca23', text: '주문량 증가로 여유 재고가 소진되고 있습니다.' }
        };

        // [Architecture] N+1 문제 방어를 위한 인메모리 캐시
        const inventoryCache = new Map();

        async function fetchVariantInventory(productNo, variantCode) {
          if (!CLIENT_ID || !FRONT_API_KEY) {
             console.error('[YKINAS] Auth Block: Front API Key가 DB에 없습니다.');
             return null;
          }

          if (inventoryCache.has(variantCode)) {
            return inventoryCache.get(variantCode); // Cache Hit
          }

          try {
            const authHeader = 'Basic ' + btoa(CLIENT_ID + ':' + FRONT_API_KEY);
            // Cafe24 Front API 전용 게이트웨이 호출
            const url = 'https://' + MALL_ID + '.cafe24api.com/api/v2/products/' + productNo + '/variants/' + variantCode + '/inventories';
            
            const response = await fetch(url, {
              method: 'GET',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'X-Cafe24-Api-Version': API_VERSION,
                'X-Cafe24-Client-Id': CLIENT_ID
              }
            });

            if (!response.ok) {
              if (response.status === 401) console.error('[YKINAS] 401 Unauthorized: 해당 테스트몰에 앱 설치가 필요합니다.');
              if (response.status === 429) console.error('[YKINAS] 429 Rate Limit Exceeded!');
              throw new Error('API Error: ' + response.status);
            }
            
            const data = await response.json();
            const qty = data.inventory.quantity;
            
            inventoryCache.set(variantCode, qty); // Cache Miss -> Set
            return qty;
          } catch (error) {
            console.error('[YKINAS] Fetch error:', error);
            return null;
          }
        }

        function renderDynamicStockWidget(quantity) {
          let tier = null;
          if (quantity > 0 && quantity <= STOCK_TIERS.CRITICAL.max) tier = STOCK_TIERS.CRITICAL;
          else if (quantity > STOCK_TIERS.CRITICAL.max && quantity <= STOCK_TIERS.WARNING.max) tier = STOCK_TIERS.WARNING;
          
          const existingContainer = document.getElementById('ykinas-stock-widget-container');
          
          // 재고 넉넉함(10개 초과) 또는 완전 품절(0) 시 UI 숨김
          if (!tier) {
            if (existingContainer) existingContainer.style.display = 'none';
            return;
          }

          // 최적 렌더링 위치 탐색 (Cascade Pattern)
          const targetArea = document.querySelector('.xans-product-detail .totalPrice') 
                          || document.querySelector('.xans-product-option');
                          
          if (!targetArea) return;

          let container = existingContainer;
          if (!container) {
            container = document.createElement('div');
            container.id = 'ykinas-stock-widget-container';
            targetArea.insertAdjacentElement('afterend', container);
          }
          
          container.style.display = 'block';
          
          // [Isolation] 스킨 CSS 오염 방지
          let shadowRoot = container.shadowRoot || container.attachShadow({ mode: 'open' });
          
          shadowRoot.innerHTML = \`
            <style>
              .ykinas-stock-wrapper {
                display: flex; align-items: center; padding: 12px 16px;
                background-color: #fafafa; border: 1px solid #eeeeee;
                border-radius: 4px; margin-top: 10px; width: 100%; box-sizing: border-box;
              }
              .ykinas-dot {
                width: 6px; height: 6px; background-color: \${tier.color};
                border-radius: 50%; margin-right: 12px;
                animation: pulse 2s infinite;
              }
              @keyframes pulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 \${tier.color}80; }
                70% { transform: scale(1.2); box-shadow: 0 0 0 6px \${tier.color}00; }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 \${tier.color}00; }
              }
              .ykinas-text { font-size: 13px; color: #555; font-family: sans-serif; }
              .ykinas-qty { font-weight: bold; color: #111; margin-left: 4px; }
            </style>
            <div class="ykinas-stock-wrapper">
              <div class="ykinas-dot"></div>
              <div class="ykinas-text">\${tier.text} <span class="ykinas-qty">(\${quantity}개)</span></div>
            </div>
          \`;
        }

        // [Architecture] 무의미한 API 연사를 막는 Debouncing 
        let debounceTimer;
        function debouncedCheckOptions(productNo) {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            const inputs = document.querySelectorAll('input[name="option_box_id"], input[id^="option_box1_id"]');
            
            inputs.forEach(async (input) => {
              const variantCode = input.value;
              if (!variantCode) return;
              
              const qty = await fetchVariantInventory(productNo, variantCode);
              if (qty !== null) renderDynamicStockWidget(qty);
            });
          }, 300);
        }

        function initModule() {
          const productNo = window.iProductNo || document.querySelector('meta[property="product:productId"]')?.content;
          if (!productNo) return;

          const optionArea = document.querySelector('.xans-product-option');
          if (!optionArea) return;

          // Event Delegation 방식을 통한 성능 최적화
          optionArea.addEventListener('change', () => debouncedCheckOptions(productNo), true);
          optionArea.addEventListener('click', () => debouncedCheckOptions(productNo), true);
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
    return res.status(500).send('console.error("[YKINAS] Module load failed.");');
  }
}