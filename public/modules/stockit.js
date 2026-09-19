// public/modules/stockit.js (Frontend Client 최종 최적화)
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

  let globalStockMap = {};

  async function preFetchAllInventory(productNo) {
    if (!MALL_ID) return;
    const proxyUrl = `https://ykinas-web.vercel.app/api/stockit?mall_id=${MALL_ID}&product_no=${productNo}`;
    try {
      const response = await fetch(proxyUrl, { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        globalStockMap = data.stockMap || {};
        console.log('[YKINAS Stockit] 모든 품목 재고 캐싱 완료:', globalStockMap);
        
        // 💡 캐시가 완료된 시점에 이미 옵션이 선택되어 있다면 즉시 렌더링 (속도 최적화)
        instantCheckOptions(); 
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
    
    container.style.display = 'block'; // 리셋 후 다시 노출

    let shadowRoot = container.shadowRoot || container.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = `
      <style>
        .ykinas-stock-wrapper { display: flex; align-items: center; padding: 12px 16px; background-color: #fafafa; border: 1px solid #eeeeee; border-radius: 4px; margin-top: 10px; width: 100%; box-sizing: border-box; transition: all 0.2s ease-in-out; }
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
    
    // 💡 선택된 옵션이 없으면 위젯을 완전히 숨겨서 초기화(Reset) 합니다.
    if (inputs.length === 0) {
       if (container) container.style.display = 'none';
       return;
    }

    // 💡 여러 옵션 중 가장 마지막에 추가된(최신) 옵션의 재고를 기준으로 렌더링
    const lastInput = inputs[inputs.length - 1];
    const variantCode = lastInput.value;

    if (variantCode && globalStockMap[variantCode] !== undefined) {
      renderDynamicStockWidget(globalStockMap[variantCode]);
    }
  }

  function initModule() {
    const productNo = window.iProductNo || document.querySelector('meta[property="product:productId"]')?.content;
    if (!productNo) return;

    preFetchAllInventory(productNo);

    const observeTarget = document.querySelector('.xans-product-detail') || document.body;
    
    // 💡 부정확한 click 이벤트 대신 MutationObserver로 카페24의 DOM 조작을 실시간 모니터링
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      mutations.forEach(mutation => {
        // 하위 요소(옵션 박스)가 추가되거나 삭제될 때만 반응
        if (mutation.type === 'childList') shouldUpdate = true;
      });
      if (shouldUpdate) instantCheckOptions();
    });

    // 💡 하위 노드의 변경사항을 깊게 관찰
    observer.observe(observeTarget, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initModule);
  else initModule();
})(window);