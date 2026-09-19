// public/modules/stockit.js (Full-stack Gidiper - Layout & Margin Override Complete)
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

  // 💡 [프론트엔드 핵심] 바깥쪽 카페24 #totalProducts 마진을 강제 0으로 오버라이드하는 스타일 주입
  function injectGlobalOverrideStyle() {
    const overrideStyleId = 'ykinas-stock-global-override';
    if (!document.getElementById(overrideStyleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = overrideStyleId;
      styleEl.innerHTML = `
        .xans-product-detail .infoArea #totalProducts {
          margin-bottom: 0 !important;
        }
      `;
      document.head.appendChild(styleEl);
    }
  }

  // public/modules/stockit.js 내부 Fetch 함수 교체
  async function preFetchAllInventory(productNo) {
    if (!MALL_ID) return;
    const proxyUrl = `https://ykinas-web.vercel.app/api/stockit?mall_id=${MALL_ID}&product_no=${productNo}`;

    try {
      const response = await fetch(proxyUrl, { method: 'GET' });

      // 💡 [핵심 방어 로직] 응답 헤더가 JSON일 때만 파싱 시도
      const contentType = response.headers.get("content-type");
      if (response.ok && contentType && contentType.includes("application/json")) {
        const data = await response.json();
        globalStockMap = data.stockMap || {};
        instantCheckOptions();
      } else {
        // JSON이 아니거나 4xx/5xx 에러인 경우 조용히 무시 (Silent Fail)
        console.warn('[YKINAS Stockit] 재고 데이터를 불러오지 못했거나 권한이 없습니다.');
      }
    } catch (error) {
      // 네트워크 단절 등 치명적 에러 발생 시에도 UI 렌더링에 영향을 주지 않음
      console.warn('[YKINAS Stockit] Fetch Error 발생');
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

    // 위젯 노출 시 전역 마진 오버라이드 활성화
    injectGlobalOverrideStyle();
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
        /* 💡 [수정] 데스크탑(768px 이상) margin-top: 0, margin-bottom: 40px 적용 */
        @media (min-width: 768px) {
          .ykinas-stock-wrapper { 
            margin-top: 0; 
            margin-bottom: 40px; 
          }
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
    const inputs = Array.from(document.querySelectorAll('input[name="option_box_id"], input[id^="option_box"][id$="_id"]'));
    const container = document.getElementById('ykinas-stock-widget-container');

    if (inputs.length === 0) {
      if (container) container.style.display = 'none';
      return;
    }

    const lastInput = inputs[inputs.length - 1];
    const targetVariantCode = lastInput.value;

    if (!targetVariantCode || globalStockMap[targetVariantCode] === undefined) {
      if (container) container.style.display = 'none';
      return;
    }

    let totalUserQtyForTarget = 0;

    inputs.forEach((input, index) => {
      if (input.value !== targetVariantCode) return;

      let qty = 1;
      const idMatch = input.id ? input.id.match(/option_box(\d+)_id/) : null;
      if (idMatch) {
        const qtyInput = document.getElementById(`option_box${idMatch[1]}_quantity`);
        if (qtyInput) qty = parseInt(qtyInput.value, 10) || 1;
      } else {
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