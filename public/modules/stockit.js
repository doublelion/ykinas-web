// public/modules/stockit.js
(function (global) {
  'use strict';

  // [Idempotency] 개별 모듈 중복 실행 방어
  if (global.__YKINAS_STOCK_LOADED__) return;
  global.__YKINAS_STOCK_LOADED__ = true;

  // 부트스트래퍼(inject.js)가 넘겨준 설정값 파싱
  const currentScript = document.currentScript;
  let config = {};
  try {
    config = currentScript && currentScript.dataset.config ? JSON.parse(currentScript.dataset.config) : {};
  } catch (e) {
    console.error('[YKINAS Stockit] config parsing error', e);
    return;
  }

  // DB(modules_config)에서 가져온 인증 키
  const CLIENT_ID = config.clientId || '';
  const FRONT_API_KEY = config.frontApiKey || '';
  const API_VERSION = '2025-12-01';
  const MALL_ID = CAFE24API.MALL_ID || window.CAFE24?.MALL_ID || ''; // 카페24 전역 객체에서 자동 추출

  // 미니멀 UI 상태 정의
  const STOCK_TIERS = {
    CRITICAL: { max: 3, color: '#ff6b6b', text: '품절 임박! 재고가 얼마 남지 않았습니다.' },
    WARNING: { max: 10, color: '#fcca23', text: '주문량 증가로 여유 재고가 소진되고 있습니다.' }
  };

  // [Architecture] N+1 문제 방어를 위한 인메모리 캐시
  const inventoryCache = new Map();

  async function fetchVariantInventory(productNo, variantCode) {
    if (!CLIENT_ID || !FRONT_API_KEY || !MALL_ID) {
      console.error('[YKINAS Stockit] Auth Block: API Key 또는 Mall ID가 누락되었습니다.');
      return null;
    }

    if (inventoryCache.has(variantCode)) {
      return inventoryCache.get(variantCode); // Cache Hit
    }

    try {
      const authHeader = 'Basic ' + btoa(CLIENT_ID + ':' + FRONT_API_KEY);
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

      if (!response.ok) throw new Error('API Error: ' + response.status);

      const data = await response.json();
      const qty = data.inventory.quantity;

      inventoryCache.set(variantCode, qty); // Cache Miss -> Set
      return qty;
    } catch (error) {
      console.error('[YKINAS Stockit] Fetch error:', error);
      return null;
    }
  }

  function renderDynamicStockWidget(quantity) {
    let tier = null;
    if (quantity > 0 && quantity <= STOCK_TIERS.CRITICAL.max) tier = STOCK_TIERS.CRITICAL;
    else if (quantity > STOCK_TIERS.CRITICAL.max && quantity <= STOCK_TIERS.WARNING.max) tier = STOCK_TIERS.WARNING;

    const existingContainer = document.getElementById('ykinas-stock-widget-container');

    if (!tier) {
      if (existingContainer) existingContainer.style.display = 'none';
      return;
    }

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
  }

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

    optionArea.addEventListener('change', () => debouncedCheckOptions(productNo), true);
    optionArea.addEventListener('click', () => debouncedCheckOptions(productNo), true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModule);
  } else {
    initModule();
  }
})(window);