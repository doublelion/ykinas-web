// public/modules/stockit.js (Full-stack Gidiper - Telemetry & Robust Extraction)
(function (global) {
  'use strict';
  if (global.__YKINAS_STOCK_LOADED__) return;
  global.__YKINAS_STOCK_LOADED__ = true;

  // 💡 1단계 관문: 스크립트가 정상 주입되었는지 확인하는 녹색 인디케이터
  console.log('%c[YKINAS Stockit] 🚀 Module Initializing...', 'color: #20c997; font-weight: bold; font-size: 12px;');

  const MALL_ID = window.CAFE24API?.MALL_ID || window.CAFE24?.MALL_ID || '';

  const STOCK_TIERS = {
    SOLDOUT: { color: '#868e96', text: '현재 품절된 상품입니다.' },
    OVER_LIMIT: { color: '#ff6b6b', text: '선택하신 수량이 최대 구매 가능 수량입니다.' },
    CRITICAL: { max: 3, color: '#ff6b6b', text: '품절 임박! 재고가 얼마 남지 않았습니다.' },
    WARNING: { max: 10, color: '#fcca23', text: '주문량 증가로 여유 재고가 소진되고 있습니다.' },
    SAFE: { max: 99999, color: '#20c997', text: '재고가 여유롭게 준비되어 있습니다.' }
  };

  let globalStockMap = {};

  function injectGlobalOverrideStyle() {
    const overrideStyleId = 'ykinas-stock-global-override';
    if (!document.getElementById(overrideStyleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = overrideStyleId;
      styleEl.innerHTML = `.xans-product-detail .infoArea #totalProducts { margin-bottom: 0 !important; }`;
      document.head.appendChild(styleEl);
    }
  }

  async function preFetchAllInventory(productNo) {
    if (!MALL_ID) return;
    const proxyUrl = `https://ykinas-web.vercel.app/api/stockit?mall_id=${MALL_ID}&product_no=${productNo}`;

    try {
      console.log(`[YKINAS Stockit] 📡 서버에 재고 데이터 요청 중... (상품번호: ${productNo})`);
      const response = await fetch(proxyUrl, { method: 'GET' });
      const contentType = response.headers.get("content-type") || "";

      if (response.ok && contentType.includes("application/json")) {
        const data = await response.json();
        globalStockMap = data.stockMap || {};
        // 💡 2단계 관문: 서버에서 성공적으로 받아온 재고 맵핑 데이터 노출
        console.log('%c[YKINAS Stockit] 📦 데이터 로드 성공:', 'color: #3b82f6; font-weight: bold;', globalStockMap);
        instantCheckOptions();
      } else {
        console.warn(`[YKINAS Stockit] ⚠️ API 거부 또는 JSON 에러. 상태코드: ${response.status}`);
      }
    } catch (error) {
      console.error('[YKINAS Stockit] 🚨 네트워크 페칭 에러:', error);
    }
  }

  function renderDynamicStockWidget(serverStock, userSelectedQty) {
    let tier = STOCK_TIERS.SAFE;
    let displayQty = 0;
    let isPulse = true;

    if (serverStock <= 0) {
      tier = STOCK_TIERS.SOLDOUT; displayQty = 0; isPulse = false;
    } else if (userSelectedQty > serverStock) {
      tier = STOCK_TIERS.OVER_LIMIT; displayQty = serverStock; isPulse = true;
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

    injectGlobalOverrideStyle();
    container.style.display = 'block';

    let shadowRoot = container.shadowRoot || container.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = `
      <style>
        .ykinas-stock-wrapper { display: flex; align-items: center; padding: 12px 16px; background-color: #fafafa; border: 1px solid #eeeeee; border-radius: 4px; width: 100%; box-sizing: border-box; transition: all 0.2s ease-in-out; margin-top: 10px; margin-bottom: 10px; }
        @media (min-width: 768px) { .ykinas-stock-wrapper { margin-top: 0; margin-bottom: 40px; } }
        .ykinas-dot { width: 6px; height: 6px; background-color: ${tier.color}; border-radius: 50%; margin-right: 12px; ${isPulse ? 'animation: pulse 2s infinite;' : ''} }
        @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 ${tier.color}80; } 70% { transform: scale(1.2); box-shadow: 0 0 0 6px ${tier.color}00; } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 ${tier.color}00; } }
        .ykinas-text { font-size: 13px; color: #555; font-family: sans-serif; line-height: 1.4; }
        .ykinas-qty { font-weight: bold; color: #111; margin-left: 4px; }
      </style>
      <div class="ykinas-stock-wrapper"><div class="ykinas-dot"></div><div class="ykinas-text">${tier.text} ${serverStock > 0 ? `<span class="ykinas-qty">(${displayQty}개)</span>` : ''}</div></div>
    `;
  }

  // public/modules/stockit.js 내부에 있는 instantCheckOptions 함수만 아래 코드로 교체합니다.

  function instantCheckOptions() {
    // 1. 상품 상세 영역으로 스코프 제한 (다른 추천상품 위젯 등의 간섭 원천 차단)
    const detailArea = document.querySelector('.xans-product-detail') || document;

    // 💡 [핵심 교정 1] 카페24의 껍데기 input을 제외하고, 실제 사용자가 추가한 '옵션 행(option_box1_id...)'만 추출
    const addedOptions = Array.from(detailArea.querySelectorAll('input[id^="option_box"][id$="_id"]'))
      .filter(input => input.id !== 'option_box_id');

    const container = document.getElementById('ykinas-stock-widget-container');
    let targetVariantCode = null;
    let totalUserQtyForTarget = 1;

    if (addedOptions.length > 0) {
      // 💡 [핵심 교정 2] 멀티 옵션: 항상 배열의 가장 마지막(최하단에 방금 추가된) 옵션을 최우선 타겟으로 설정
      const lastOption = addedOptions[addedOptions.length - 1];
      targetVariantCode = lastOption.value;
      totalUserQtyForTarget = 0;

      // 타겟과 동일한 옵션 코드를 가진 행들의 수량을 모두 찾아 합산 (계산 로직 복원)
      addedOptions.forEach(input => {
        if (input.value === targetVariantCode) {
          const idMatch = input.id.match(/option_box(\d+)_id/);
          if (idMatch) {
            const qtyInput = document.getElementById(`option_box${idMatch[1]}_quantity`);
            if (qtyInput) totalUserQtyForTarget += parseInt(qtyInput.value, 10) || 1;
          }
        }
      });
    } else {
      // 단일 옵션 (옵션이 없는 기본 상품)의 경우 방어 로직
      const baseInput = detailArea.querySelector('input[name="option_box_id"]');
      if (baseInput && baseInput.value) {
        targetVariantCode = baseInput.value;
        const qtyInput = detailArea.querySelector('input[id*="quantity"], input[name*="quantity"]');
        if (qtyInput) totalUserQtyForTarget = parseInt(qtyInput.value, 10) || 1;
      }
    }

    if (!targetVariantCode || globalStockMap[targetVariantCode] === undefined) {
      if (container) container.style.display = 'none';
      return;
    }

    // 추출된 서버 재고와 유저 선택 총수량을 전달 -> renderDynamicStockWidget 내부에서 (-n + 1) 계산 수행
    renderDynamicStockWidget(globalStockMap[targetVariantCode], totalUserQtyForTarget);
  }

  function initModule() {
    // 💡 강력한 상품번호 파싱: 전역변수 -> 메타태그 -> URL 정규식 순서로 3중 추적
    let productNo = window.iProductNo || document.querySelector('meta[property="product:productId"]')?.content;
    if (!productNo) {
      const match = window.location.pathname.match(/\/product\/[^\/]+\/(\d+)/);
      if (match) productNo = match[1];
    }

    if (!productNo) {
      console.error('[YKINAS Stockit] ❌ 상품 번호를 찾을 수 없어 모듈을 종료합니다.');
      return;
    }

    preFetchAllInventory(productNo);

    const observeTarget = document.querySelector('.xans-product-detail') || document.body;
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      mutations.forEach(m => { if (m.type === 'childList') shouldUpdate = true; });
      if (shouldUpdate) instantCheckOptions();
    });
    observer.observe(observeTarget, { childList: true, subtree: true });

    observeTarget.addEventListener('click', () => setTimeout(instantCheckOptions, 50));
    // (기존) observeTarget.addEventListener('input', (e) => { ... }) 부분을 아래로 교체
    observeTarget.addEventListener('input', (e) => {
      
      // 💡 옵셔널 체이닝(?.)을 사용하여 e 또는 e.target이 undefined일 때의 크래시 원천 차단
      const target = e?.target;
      if (!target) return;

      if (target.tagName === 'INPUT' && (target.id?.includes('quantity') || target.name?.includes('quantity'))) {
        // 즉시 실행하지 않고 마이크로태스크 큐로 넘겨 카페24 내장 스크립트와의 실행 순서 충돌 방지
        setTimeout(() => {
          try {
            instantCheckOptions();
          } catch (err) {
            console.warn('[YKINAS Stockit] Option check deferred:', err);
          }
        }, 0);
      }
    });

    observeTarget.addEventListener('click', (e) => {
      if (!e?.target) return;
      setTimeout(() => {
        try {
          instantCheckOptions();
        } catch (err) { }
      }, 50);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initModule);
  else initModule();
})(window);