// public/modules/stockit.js
(function (global) {
  'use strict';

  // [Idempotency] 중복 실행 방어
  if (global.__YKINAS_STOCK_LOADED__) return;
  global.__YKINAS_STOCK_LOADED__ = true;

  console.log('[YKINAS Stockit] 모듈 초기화 시작');

  const currentScript = document.currentScript;
  let config = {};
  try {
    config = currentScript && currentScript.dataset.config ? JSON.parse(currentScript.dataset.config) : {};
  } catch (e) {
    console.error('[YKINAS Stockit] config parsing error', e);
    return;
  }

  const CLIENT_ID = config.clientId || '';
  const FRONT_API_KEY = config.frontApiKey || '';
  const API_VERSION = '2025-12-01'; //
  const MALL_ID = window.CAFE24API?.MALL_ID || window.CAFE24?.MALL_ID || '';
  // 💡 [수정] 프론트 키 삭제. 이제 서버가 알아서 합니다.
  const STOCK_TIERS = {
    CRITICAL: { max: 3, color: '#ff6b6b', text: '품절 임박! 재고가 얼마 남지 않았습니다.' },
    WARNING: { max: 10, color: '#fcca23', text: '주문량 증가로 여유 재고가 소진되고 있습니다.' },
    SAFE: { max: 99999, color: '#20c997', text: '[TEST] 재고가 여유 있습니다.' }
  };

  const inventoryCache = new Map();

  async function fetchVariantInventory(productNo, variantCode) {
    if (!CLIENT_ID || !FRONT_API_KEY || !MALL_ID) {
      console.error('[YKINAS Stockit] Auth Block: 인증키 또는 MALL_ID 누락');
      return null;
    }

    if (inventoryCache.has(variantCode)) {
      console.log(`[YKINAS Stockit] 캐시된 재고 불러옴: ${variantCode} -> ${inventoryCache.get(variantCode)}개`);
      return inventoryCache.get(variantCode);
    }

    try {
      const proxyUrl = `https://ykinas-web.vercel.app/api/stockit?mall_id=${MALL_ID}&product_no=${productNo}&variant_code=${variantCode}`;

      console.log(`[YKINAS Stockit] Backend Proxy 호출 중...`);

      const response = await fetch(proxyUrl, { method: 'GET' });

      if (!response.ok) {
        // 401 인증 에러 시 캐싱하지 않고 조기 종료 (재시도 방지)
        console.error(`[YKINAS Stockit] Backend Proxy Error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const qty = data.quantity;

      console.log(`[YKINAS Stockit] 응답 완료! 현재 재고: ${qty}개`);
      inventoryCache.set(variantCode, qty);
      return qty;
    } catch (error) {
      console.error('[YKINAS Stockit] Fetch error:', error);
      return null;
    }
  }

  function renderDynamicStockWidget(quantity) {
    let tier = null;
    if (quantity <= STOCK_TIERS.CRITICAL.max) tier = STOCK_TIERS.CRITICAL;
    else if (quantity <= STOCK_TIERS.WARNING.max) tier = STOCK_TIERS.WARNING;
    else tier = STOCK_TIERS.SAFE; // 무조건 렌더링되도록 처리

    const existingContainer = document.getElementById('ykinas-stock-widget-container');

    const targetArea = document.querySelector('.xans-product-detail .totalPrice')
      || document.querySelector('.xans-product-option');

    if (!targetArea) {
      console.warn('[YKINAS Stockit] 위젯을 삽입할 타겟(.totalPrice 또는 .xans-product-option)을 찾지 못했습니다.');
      return;
    }

    let container = existingContainer;
    if (!container) {
      container = document.createElement('div');
      container.id = 'ykinas-stock-widget-container';
      targetArea.insertAdjacentElement('afterend', container);
    }

    container.style.display = 'block';

    let shadowRoot = container.shadowRoot || container.attachShadow({ mode: 'open' });

    shadowRoot.innerHTML = `
      <style>
        .ykinas-stock-wrapper {
          display: flex; align-items: center; padding: 12px 16px;
          background-color: #fafafa; border: 1px solid #eeeeee;
          border-radius: 4px; margin-top: 10px; width: 100%; box-sizing: border-box;
        }
        .ykinas-dot {
          width: 6px; height: 6px; background-color: ${tier.color};
          border-radius: 50%; margin-right: 12px;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 ${tier.color}80; }
          70% { transform: scale(1.2); box-shadow: 0 0 0 6px ${tier.color}00; }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 ${tier.color}00; }
        }
        .ykinas-text { font-size: 13px; color: #555; font-family: sans-serif; }
        .ykinas-qty { font-weight: bold; color: #111; margin-left: 4px; }
      </style>
      <div class="ykinas-stock-wrapper">
        <div class="ykinas-dot"></div>
        <div class="ykinas-text">${tier.text} <span class="ykinas-qty">(${quantity}개)</span></div>
      </div>
    `;
    console.log('[YKINAS Stockit] 위젯 렌더링 완료');
  }

  let debounceTimer;
  function debouncedCheckOptions(productNo) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      // 💡 카페24는 옵션을 선택 완료해야 DOM에 option_box_id 가 생성됩니다.
      const inputs = document.querySelectorAll('input[name="option_box_id"], input[id^="option_box1_id"]');

      console.log(`[YKINAS Stockit] DOM 업데이트 감지. 선택된 옵션 input 개수: ${inputs.length}`);

      inputs.forEach(async (input) => {
        const variantCode = input.value;
        if (!variantCode) return;

        const qty = await fetchVariantInventory(productNo, variantCode);
        if (qty !== null) renderDynamicStockWidget(qty);
      });
    }, 300); // UI 생성 대기를 위해 0.3초 딜레이
  }

  function initModule() {
    const productNo = window.iProductNo || document.querySelector('meta[property="product:productId"]')?.content;
    if (!productNo) {
      console.warn('[YKINAS Stockit] 상품 번호(productNo)를 찾을 수 없습니다.');
      return;
    }

    const optionArea = document.querySelector('.xans-product-option');
    if (!optionArea) {
      console.warn('[YKINAS Stockit] 옵션 영역(.xans-product-option)을 찾을 수 없습니다.');
      return;
    }

    console.log(`[YKINAS Stockit] 이벤트 리스너 등록 완료 (상품번호: ${productNo}) - 옵션을 선택해보세요!`);

    // 카페24 특성상 클릭이나 체인지 이벤트로 DOM 트리가 늦게 변할 수 있으므로 위임(Delegation) 사용
    optionArea.addEventListener('change', () => debouncedCheckOptions(productNo), true);
    optionArea.addEventListener('click', () => debouncedCheckOptions(productNo), true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModule);
  } else {
    initModule();
  }
})(window);