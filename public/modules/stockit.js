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
    SOLDOUT: { max: 0, color: '#868e96', text: '상품이 모두 소진되었습니다.' }, // 💡 0개 전용 티어 추가
    CRITICAL: { max: 3, color: '#ff6b6b', text: '품절 임박! 재고가 얼마 남지 않았습니다.' },
    WARNING: { max: 10, color: '#fcca23', text: '주문량 증가로 여유 재고가 소진되고 있습니다.' },
    SAFE: { max: 99999, color: '#20c997', text: '[TEST] 재고가 여유 있습니다.' }
  };

  const inventoryCache = new Map();

  async function fetchVariantInventory(productNo, variantCode) {
    if (!CLIENT_ID || !MALL_ID) {
      console.error('[YKINAS Stockit] Auth Block: 인증키 또는 MALL_ID 누락');
      return null;
    }

    if (inventoryCache.has(variantCode)) {
      console.log(`[YKINAS Stockit] 캐시된 재고 불러옴: ${variantCode} -> ${inventoryCache.get(variantCode)}개`);
      return inventoryCache.get(variantCode);
    }

    // 💡 [필수 복구] Vercel 프록시 API를 호출하기 위한 URL을 조립합니다.
    const proxyUrl = `https://ykinas-web.vercel.app/api/stockit?mall_id=${MALL_ID}&product_no=${productNo}&variant_code=${variantCode}`;

    try {
      const response = await fetch(proxyUrl, { method: 'GET' });

      if (!response.ok) {
        // 404 등 실패 시 백엔드가 내려준 JSON 상세 에러 메시지를 파싱하여 출력
        const errorData = await response.json().catch(() => ({}));
        console.warn(`[YKINAS Stockit] 옵션 미생성 또는 찾을 수 없음 (404) - [코드: ${variantCode}]`);
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
    if (quantity === 0) tier = STOCK_TIERS.SOLDOUT;
    else if (quantity <= STOCK_TIERS.CRITICAL.max) tier = STOCK_TIERS.CRITICAL;
    else if (quantity <= STOCK_TIERS.WARNING.max) tier = STOCK_TIERS.WARNING;
    else tier = STOCK_TIERS.SAFE;

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

  let globalStockMap = {}; // 전체 재고 캐시

  async function preFetchAllInventory(productNo) {
    if (!MALL_ID) return;
    const proxyUrl = `https://ykinas-web.vercel.app/api/stockit?mall_id=${MALL_ID}&product_no=${productNo}`;

    try {
      const response = await fetch(proxyUrl, { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        globalStockMap = data.stockMap || {};
        console.log('[YKINAS Stockit] 모든 옵션 재고 Pre-fetch 완료:', globalStockMap);
      }
    } catch (error) {
      console.error('[YKINAS Stockit] Pre-fetch 에러:', error);
    }
  }

  // 기존 fetchVariantInventory를 대체하는 즉각 렌더링 함수
  function instantCheckOptions() {
    const inputs = document.querySelectorAll('input[name="option_box_id"], input[id^="option_box1_id"]');
    inputs.forEach((input) => {
      const variantCode = input.value;
      if (variantCode && globalStockMap[variantCode] !== undefined) {
        // 💡 네트워크 호출 없이 즉시 렌더링
        renderDynamicStockWidget(globalStockMap[variantCode]);
      }
    });
  }

  function initModule() {
    const productNo = window.iProductNo || document.querySelector('meta[property="product:productId"]')?.content;
    if (!productNo) return;

    const optionArea = document.querySelector('.xans-product-option');
    if (!optionArea) return;

    // 1. 페이지 로드 즉시 비동기로 전체 재고 가져오기
    preFetchAllInventory(productNo);

    // 2. 옵션 클릭 시 딜레이 없이 즉시 UI 업데이트
    optionArea.addEventListener('change', instantCheckOptions, true);
    optionArea.addEventListener('click', () => setTimeout(instantCheckOptions, 50), true); // UI 생성 직후 렌더링
  }
})(window);