// public/modules/stockit.js (Full-stack Gidiper - Active Target & Multi-option Optimizer)
(function (global) {
  'use strict';
  if (global.__YKINAS_STOCK_LOADED__) return;
  global.__YKINAS_STOCK_LOADED__ = true;

  const MALL_ID = window.CAFE24API?.MALL_ID || window.CAFE24?.MALL_ID || '';
  
  const STOCK_TIERS = {
    SOLDOUT: { color: '#868e96', text: '현재 품절된 상품입니다.' },
    OVER_LIMIT: { color: '#ff6b6b', text: '선택하신 수량이 최대 구매 가능 수량입니다.' },
    CRITICAL: { max: 3, color: '#ff6b6b', text: '품절 임박! 재고가 얼마 남지 않았습니다.' },
    WARNING: { max: 10, color: '#fcca23', text: '주문량 증가로 여유 재고가 소진되고 있습니다.' },
    SAFE: { max: 99999, color: '#20c997', text: '재고가 여유롭게 준비되어 있습니다.' } 
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
        instantCheckOptions(); 
      }
    } catch (error) {
      console.error('[YKINAS Stockit] Pre-fetch Error:', error);
    }
  }

  function renderDynamicStockWidget(serverStock, userSelectedQty) {
    let tier = STOCK_TIERS.SAFE;
    let displayQty = 0;
    let isPulse = true;

    if (serverStock <= 0) {
      tier = STOCK_TIERS.SOLDOUT;
      displayQty = 0;
      isPulse = false; 
    } else if (userSelectedQty > serverStock) {
      tier = STOCK_TIERS.OVER_LIMIT;
      displayQty = serverStock; 
      isPulse = true;
    } else {
      displayQty = serverStock - userSelectedQty + 1;
      if (displayQty <= STOCK_TIERS.CRITICAL.max) tier = STOCK_TIERS.CRITICAL;
      else if (displayQty <= STOCK_TIERS.WARNING.max) tier = STOCK_TIERS.WARNING;
    }

    let container = document.getElementById('ykinas-stock-widget-container');
    const targetArea = document.getElementById('totalPrice') || document.querySelector('.totalPrice') || document.querySelector('.xans-product-detail');

    if (!targetArea) return;

    if (!container) {
      container = document.createElement('div');
      container.id = 'ykinas-stock-widget-container';
      targetArea.insertAdjacentElement('beforebegin', container);
    }
    
    container.style.display = 'block';

    let shadowRoot = container.shadowRoot || container.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = `
      <style>
        .ykinas-stock-wrapper { 
          display: flex; align-items: center; padding: 12px 16px; 
          background-color: #fafafa; border: 1px solid #eeeeee; border-radius: 4px; 
          width: 100%; box-sizing: border-box; transition: all 0.2s ease-in-out; 
          margin-top: 10px; margin-bottom: 10px;
        }
        @media (min-width: 768px) {
          .ykinas-stock-wrapper { margin-top: 20px; margin-bottom: 20px; }
        }
        .ykinas-dot { width: 6px; height: 6px; background-color: ${tier.color}; border-radius: 50%; margin-right: 12px; ${isPulse ? 'animation: pulse 2s infinite;' : ''} }
        @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 ${tier.color}80; } 70% { transform: scale(1.2); box-shadow: 0 0 0 6px ${tier.color}00; } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 ${tier.color}00; } }
        .ykinas-text { font-size: 13px; color: #555; font-family: sans-serif; line-height: 1.4; }
        .ykinas-qty { font-weight: bold; color: #111; margin-left: 4px; }
      </style>
      <div class="ykinas-stock-wrapper">
        <div class="ykinas-dot"></div>
        <div class="ykinas-text">${tier.text} ${serverStock > 0 ? `<span class="ykinas-qty">(${displayQty}개)</span>` : ''}</div>
      </div>
    `;
  }

  // 💡 [핵심 수정] activeVariantCode 인자를 받아 고객이 현재 조작 중인 옵션을 우선 처리
  function instantCheckOptions(activeVariantCode = null) {
    const inputs = Array.from(document.querySelectorAll('input[name="option_box_id"], input[id^="option_box1_id"]'));
    const container = document.getElementById('ykinas-stock-widget-container');
    
    if (inputs.length === 0) {
       if (container) container.style.display = 'none';
       return;
    }

    // 💡 화면에 있는 동일한 옵션들의 수량을 모두 합산하는 맵 생성
    const selectedQuantities = {};
    let latestVariantCode = null;

    inputs.forEach(input => {
      const vCode = input.value;
      if (!vCode) return;
      latestVariantCode = vCode; // 기본적으로 맨 마지막에 추가된 옵션 기억

      const parentRow = input.closest('tr, tbody, div.option_box_wrap, div.xans-product-option') || input.parentElement;
      let qty = 1;
      if (parentRow) {
        const qtyInput = parentRow.querySelector('input[id*="quantity"], input[name*="quantity"]');
        if (qtyInput) qty = parseInt(qtyInput.value, 10) || 1;
      }
      // 동일 품목이 여러 행일 경우 합산 처리
      selectedQuantities[vCode] = (selectedQuantities[vCode] || 0) + qty;
    });

    // 💡 고객이 방금 클릭한 옵션이 있으면 그것을 타겟으로, 없으면 맨 마지막 옵션을 타겟으로 설정
    const targetVariantCode = activeVariantCode || latestVariantCode;

    if (targetVariantCode && globalStockMap[targetVariantCode] !== undefined) {
      const serverStock = globalStockMap[targetVariantCode];
      const userQty = selectedQuantities[targetVariantCode];
      renderDynamicStockWidget(serverStock, userQty);
    } else {
      if (container) container.style.display = 'none';
    }
  }

  function initModule() {
    const productNo = window.iProductNo || document.querySelector('meta[property="product:productId"]')?.content;
    if (!productNo) return;

    preFetchAllInventory(productNo);

    const observeTarget = document.querySelector('.xans-product-detail') || document.body;
    
    // DOM 변화 감지 (새 옵션 추가/삭제 시 실행)
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      mutations.forEach(mutation => { if (mutation.type === 'childList') shouldUpdate = true; });
      // 옵션이 추가되거나 삭제될 때는 특정 타겟 없이 최신 DOM 기준으로 재계산
      if (shouldUpdate) instantCheckOptions();
    });
    observer.observe(observeTarget, { childList: true, subtree: true });

    // 💡 [핵심 수정] 사용자가 특정 옵션의 수량 버튼을 클릭했을 때, 해당 옵션의 코드를 추적하여 전달
    observeTarget.addEventListener('click', (e) => {
      const parentRow = e.target.closest('tr, tbody, div.option_box_wrap');
      let activeCode = null;
      if (parentRow) {
        const hiddenInput = parentRow.querySelector('input[name="option_box_id"], input[id^="option_box1_id"]');
        if (hiddenInput) activeCode = hiddenInput.value;
      }
      setTimeout(() => instantCheckOptions(activeCode), 50);
    });

    // 💡 [핵심 수정] 사용자가 특정 옵션의 수량을 직접 키보드로 입력했을 때 추적
    observeTarget.addEventListener('input', (e) => {
      if (e.target.tagName === 'INPUT' && (e.target.id.includes('quantity') || e.target.name.includes('quantity'))) {
        const parentRow = e.target.closest('tr, tbody, div.option_box_wrap');
        let activeCode = null;
        if (parentRow) {
          const hiddenInput = parentRow.querySelector('input[name="option_box_id"], input[id^="option_box1_id"]');
          if (hiddenInput) activeCode = hiddenInput.value;
        }
        instantCheckOptions(activeCode);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initModule);
  else initModule();
})(window);