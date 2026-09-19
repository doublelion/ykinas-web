// public/modules/stockit.js (Full-stack Gidiper - Absolute ID Matching)
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

  function instantCheckOptions() {
    // 💡 옵션 코드가 담긴 hidden input들만 정확히 추출
    const inputs = Array.from(document.querySelectorAll('input[name="option_box_id"], input[id^="option_box"][id$="_id"]'));
    const container = document.getElementById('ykinas-stock-widget-container');
    
    if (inputs.length === 0) {
       if (container) container.style.display = 'none';
       return;
    }

    // 💡 제안해주신 대로 항상 '가장 마지막(최근)에 추가된 옵션'을 메인 타겟으로 고정
    const lastInput = inputs[inputs.length - 1];
    const targetVariantCode = lastInput.value;

    if (!targetVariantCode || globalStockMap[targetVariantCode] === undefined) {
      if (container) container.style.display = 'none';
      return;
    }

    let totalUserQtyForTarget = 0;

    // 💡 화면에 있는 타겟 옵션의 수량을 모두 찾아 합산 (동일 옵션 중복 추가 대비)
    inputs.forEach((input, index) => {
      if (input.value !== targetVariantCode) return; // 타겟 옵션이 아니면 패스

      let qty = 1;
      // 1. 고유 ID 정규식 매칭 (가장 정확한 방법: option_box1_id -> option_box1_quantity)
      const idMatch = input.id ? input.id.match(/option_box(\d+)_id/) : null;
      if (idMatch) {
        const qtyInput = document.getElementById(`option_box${idMatch[1]}_quantity`);
        if (qtyInput) qty = parseInt(qtyInput.value, 10) || 1;
      } else {
        // 2. 인덱스 기반 대체 매칭
        const qtyInputs = document.querySelectorAll('input[id*="quantity"], input[name*="quantity_opt"]');
        if (qtyInputs[index]) qty = parseInt(qtyInputs[index].value, 10) || 1;
      }
      totalUserQtyForTarget += qty;
    });

    const serverStock = globalStockMap[targetVariantCode];
    renderDynamicStockWidget(serverStock, totalUserQtyForTarget);
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

    // 수량 변경 버튼(+, -) 및 직접 입력 시 갱신
    observeTarget.addEventListener('click', () => setTimeout(instantCheckOptions, 50));
    observeTarget.addEventListener('input', (e) => {
      if (e.target.tagName === 'INPUT' && (e.target.id.includes('quantity') || e.target.name.includes('quantity'))) {
        instantCheckOptions();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initModule);
  else initModule();
})(window);