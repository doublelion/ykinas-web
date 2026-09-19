// public/modules/stockit.js (Frontend Client)
(function (global) {
  'use strict';
  if (global.__YKINAS_STOCK_LOADED__) return;
  global.__YKINAS_STOCK_LOADED__ = true;

  const MALL_ID = window.CAFE24API?.MALL_ID || window.CAFE24?.MALL_ID || '';
  
  const STOCK_TIERS = {
    SOLDOUT: { max: 0, color: '#868e96', text: '상품이 모두 소진되었습니다.' },
    CRITICAL: { max: 3, color: '#ff6b6b', text: '품절 임박! 재고가 얼마 남지 않았습니다.' },
    WARNING: { max: 10, color: '#fcca23', text: '주문량 증가로 여유 재고가 소진되고 있습니다.' },
    SAFE: { max: 99999, color: '#20c997', text: '[TEST] 재고가 여유 있습니다.' }
  };

  let globalStockMap = {}; // 💡 전체 옵션 가용재고 캐시

  async function preFetchAllInventory(productNo) {
    if (!MALL_ID) return;
    const proxyUrl = `https://ykinas-web.vercel.app/api/stockit?mall_id=${MALL_ID}&product_no=${productNo}`;
    try {
      const response = await fetch(proxyUrl, { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        globalStockMap = data.stockMap || {};
        console.log('[YKINAS Stockit] 모든 품목 재고 캐싱 완료:', globalStockMap);
      }
    } catch (error) {
      console.error('[YKINAS Stockit] Pre-fetch 에러:', error);
    }
  }

  function renderDynamicStockWidget(quantity) {
    let tier = STOCK_TIERS.SAFE;
    if (quantity === 0) tier = STOCK_TIERS.SOLDOUT;
    else if (quantity <= STOCK_TIERS.CRITICAL.max) tier = STOCK_TIERS.CRITICAL;
    else if (quantity <= STOCK_TIERS.WARNING.max) tier = STOCK_TIERS.WARNING;

    let container = document.getElementById('ykinas-stock-widget-container');
    const targetArea = document.querySelector('.xans-product-detail .totalPrice') || document.querySelector('.xans-product-option');

    if (!targetArea) return;

    if (!container) {
      container = document.createElement('div');
      container.id = 'ykinas-stock-widget-container';
      targetArea.insertAdjacentElement('afterend', container);
    }
    // 숨겨졌던 위젯 다시 노출
    container.style.display = 'block';

    let shadowRoot = container.shadowRoot || container.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = `
      <style>
        .ykinas-stock-wrapper { display: flex; align-items: center; padding: 12px 16px; background-color: #fafafa; border: 1px solid #eeeeee; border-radius: 4px; margin-top: 10px; width: 100%; box-sizing: border-box; }
        .ykinas-dot { width: 6px; height: 6px; background-color: ${tier.color}; border-radius: 50%; margin-right: 12px; ${quantity > 0 ? 'animation: pulse 2s infinite;' : ''} }
        @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 ${tier.color}80; } 70% { transform: scale(1.2); box-shadow: 0 0 0 6px ${tier.color}00; } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 ${tier.color}00; } }
        .ykinas-text { font-size: 13px; color: #555; font-family: sans-serif; }
        .ykinas-qty { font-weight: bold; color: #111; margin-left: 4px; }
      </style>
      <div class="ykinas-stock-wrapper">
        <div class="ykinas-dot"></div>
        <div class="ykinas-text">${tier.text} <span class="ykinas-qty">(${quantity}개)</span></div>
      </div>
    `;
  }

  function instantCheckOptions() {
    const inputs = document.querySelectorAll('input[name="option_box_id"], input[id^="option_box1_id"]');
    const container = document.getElementById('ykinas-stock-widget-container');
    
    // 💡 선택된 옵션을 지웠을 때 위젯도 함께 숨김
    if (inputs.length === 0) {
       if (container) container.style.display = 'none';
       return;
    }

    inputs.forEach((input) => {
      const variantCode = input.value;
      // 💡 서버 통신 딜레이 없이 전역 캐시 맵에서 값을 꺼내 즉각 렌더링
      if (variantCode && globalStockMap[variantCode] !== undefined) {
        renderDynamicStockWidget(globalStockMap[variantCode]);
      }
    });
  }

  function initModule() {
    const productNo = window.iProductNo || document.querySelector('meta[property="product:productId"]')?.content;
    if (!productNo) return;

    // 1. 페이지 로드 시 백그라운드에서 1회 전체 조회 실행
    preFetchAllInventory(productNo);

    const optionArea = document.querySelector('.xans-product-option');
    if (optionArea) {
      // 2. 여러 번 클릭/변경해도 네트워크 지연 없이 즉각 반응
      optionArea.addEventListener('change', instantCheckOptions, true);
      optionArea.addEventListener('click', () => setTimeout(instantCheckOptions, 50), true);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initModule);
  else initModule();
})(window);