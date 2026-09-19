// public/modules/stockit.js (Final Fix - 톤앤매너 및 차감 로직 최적화)
(function (global) {
  'use strict';
  if (global.__YKINAS_STOCK_LOADED__) return;
  global.__YKINAS_STOCK_LOADED__ = true;

  const MALL_ID = window.CAFE24API?.MALL_ID || window.CAFE24?.MALL_ID || '';
  
  // 💡 [기획/디자인] 톤앤매너 수정 및 예외 상태(OVER_LIMIT) 추가
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

    // 💡 [프론트엔드 핵심 로직] 4가지 상태에 따른 완벽한 분기 처리
    if (serverStock <= 0) {
      // 1. 아예 재고가 없는 경우
      tier = STOCK_TIERS.SOLDOUT;
      displayQty = 0;
      isPulse = false; // 품절 시 펄스 애니메이션 중지
    } else if (userSelectedQty > serverStock) {
      // 2. 남은 재고보다 많은 수량을 선택한 경우 (오해 방지)
      tier = STOCK_TIERS.OVER_LIMIT;
      displayQty = serverStock; // 실제 최대치 고정 노출
      isPulse = true;
    } else {
      // 3. 정상적인 선택: 첫 1개는 차감하지 않고, 추가 수량부터 1개씩 차감
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

  function instantCheckOptions() {
    const inputs = document.querySelectorAll('input[name="option_box_id"], input[id^="option_box1_id"]');
    const container = document.getElementById('ykinas-stock-widget-container');
    
    if (inputs.length === 0) {
       if (container) container.style.display = 'none';
       return;
    }

    const lastInput = inputs[inputs.length - 1];
    const variantCode = lastInput.value;

    if (variantCode && globalStockMap[variantCode] !== undefined) {
      const serverStock = globalStockMap[variantCode];
      let userSelectedQty = 1; // 💡 기본 수량 1로 초기화

      const parentRow = lastInput.closest('tr, tbody, div.option_box_wrap, div.xans-product-option') || lastInput.parentElement;
      if (parentRow) {
        const qtyInput = parentRow.querySelector('input[id*="quantity"], input[name*="quantity"]');
        if (qtyInput) {
          userSelectedQty = parseInt(qtyInput.value, 10) || 1;
        }
      }

      // 두 값을 독립적으로 넘겨 render 함수 내에서 정확히 비교하도록 수정
      renderDynamicStockWidget(serverStock, userSelectedQty);
    }
  }

  function initModule() {
    const productNo = window.iProductNo || document.querySelector('meta[property="product:productId"]')?.content;
    if (!productNo) return;

    preFetchAllInventory(productNo);

    const observeTarget = document.querySelector('.xans-product-detail') || document.body;
    
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      mutations.forEach(mutation => { if (mutation.type === 'childList') shouldUpdate = true; });
      if (shouldUpdate) instantCheckOptions();
    });
    observer.observe(observeTarget, { childList: true, subtree: true });

    observeTarget.addEventListener('click', (e) => {
      setTimeout(instantCheckOptions, 50);
    });
    observeTarget.addEventListener('input', (e) => {
      if (e.target.tagName === 'INPUT' && (e.target.id.includes('quantity') || e.target.name.includes('quantity'))) {
        instantCheckOptions();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initModule);
  else initModule();
})(window);