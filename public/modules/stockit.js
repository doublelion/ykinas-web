// public/modules/stockit.js (Full-stack Gidiper - Final Optimizer)
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
        instantCheckOptions(); 
      }
    } catch (error) {
      console.error('[YKINAS Stockit] Pre-fetch Error:', error);
    }
  }

  function renderDynamicStockWidget(quantity) {
    let tier = STOCK_TIERS.SAFE;
    if (quantity <= 0) tier = STOCK_TIERS.SOLDOUT; // 음수 방지 포함
    else if (quantity <= STOCK_TIERS.CRITICAL.max) tier = STOCK_TIERS.CRITICAL;
    else if (quantity <= STOCK_TIERS.WARNING.max) tier = STOCK_TIERS.WARNING;

    let container = document.getElementById('ykinas-stock-widget-container');
    
    // 💡 [수정] 위젯 삽입 타겟을 totalPrice로 명시하고, 찾지 못하면 대체재 탐색
    const targetArea = document.getElementById('totalPrice') || document.querySelector('.totalPrice') || document.querySelector('.xans-product-detail');

    if (!targetArea) return;

    if (!container) {
      container = document.createElement('div');
      container.id = 'ykinas-stock-widget-container';
      // 💡 [수정] totalPrice 요소의 '바로 위(beforebegin)'에 삽입하여 시선 흐름 최적화
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
          margin-top: 10px; /* 모바일 기본 마진 */
          margin-bottom: 10px;
        }
        /* 💡 [수정] 데스크탑(768px 이상)일 때 margin-top 20px 적용 */
        @media (min-width: 768px) {
          .ykinas-stock-wrapper { margin-top: 20px; margin-bottom: 20px; }
        }
        .ykinas-dot { width: 6px; height: 6px; background-color: ${tier.color}; border-radius: 50%; margin-right: 12px; ${quantity > 0 ? 'animation: pulse 2s infinite;' : ''} }
        @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 ${tier.color}80; } 70% { transform: scale(1.2); box-shadow: 0 0 0 6px ${tier.color}00; } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 ${tier.color}00; } }
        .ykinas-text { font-size: 13px; color: #555; font-family: sans-serif; }
        .ykinas-qty { font-weight: bold; color: #111; margin-left: 4px; }
      </style>
      <div class="ykinas-stock-wrapper">
        <div class="ykinas-dot"></div>
        <div class="ykinas-text">${tier.text} <span class="ykinas-qty">(${Math.max(0, quantity)}개)</span></div>
      </div>
    `;
  }

  function instantCheckOptions() {
    const inputs = document.querySelectorAll('input[name="option_box_id"], input[id^="option_box1_id"]');
    const container = document.getElementById('ykinas-stock-widget-container');
    
    // 1. 다중 옵션 리셋 대처: 옵션이 하나도 없으면 완벽히 숨김 처리
    if (inputs.length === 0) {
       if (container) container.style.display = 'none';
       return;
    }

    // 2. 여러 옵션 중 가장 마지막에 상호작용한(최신) 옵션 기준
    const lastInput = inputs[inputs.length - 1];
    const variantCode = lastInput.value;

    if (variantCode && globalStockMap[variantCode] !== undefined) {
      const serverStock = globalStockMap[variantCode];
      let userSelectedQty = 0; // 고객이 추가한 수량

      // 3. 💡 [로직 추가] 카페24 DOM 구조를 타고 올라가 고객이 입력한 수량 파악
      // 카페24 스킨별로 구조가 다르므로 tr, tbody, div 등 범용적인 부모 컨테이너 탐색
      const parentRow = lastInput.closest('tr, tbody, div.option_box_wrap, div.xans-product-option') || lastInput.parentElement;
      if (parentRow) {
        const qtyInput = parentRow.querySelector('input[id*="quantity"], input[name*="quantity"]');
        if (qtyInput) {
          userSelectedQty = parseInt(qtyInput.value, 10) || 1; // 값을 읽거나 기본값 1
        }
      }

      // 4. 💡 [수량 0 만들기 로직] (서버 가용재고) - (고객 선택 수량) 계산하여 노출
      const displayStock = serverStock - userSelectedQty;
      renderDynamicStockWidget(displayStock);
    }
  }

  function initModule() {
    const productNo = window.iProductNo || document.querySelector('meta[property="product:productId"]')?.content;
    if (!productNo) return;

    preFetchAllInventory(productNo);

    const observeTarget = document.querySelector('.xans-product-detail') || document.body;
    
    // 1. DOM 옵션 박스 추가/삭제 실시간 감지
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      mutations.forEach(mutation => { if (mutation.type === 'childList') shouldUpdate = true; });
      if (shouldUpdate) instantCheckOptions();
    });
    observer.observe(observeTarget, { childList: true, subtree: true });

    // 2. 수량 증감 버튼 클릭 및 직접 입력 시 즉각 반응
    observeTarget.addEventListener('click', (e) => {
      // 수량 증감 버튼류를 클릭했을 때 딜레이(50ms)를 주어 카페24 스크립트가 Input 값을 바꿀 시간을 벌어줌
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