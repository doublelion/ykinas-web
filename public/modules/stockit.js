// public/modules/stockit.js (Full-stack Gidiper - Telemetry & Robust Extraction)
(function (global) {
  'use strict';

  // 💡 [핵심 교정] 관리자 페이지(Admin/Appstore)에서 스크립트가 로드되었을 경우 즉시 실행 차단
  if (global.location.pathname.includes('/admin/')) return;

  if (global.__YKINAS_STOCK_LOADED__) return;
  global.__YKINAS_STOCK_LOADED__ = true;

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
  let currentTargetVariant = null;
  // 💡 1. 캡처링 인터셉터 함수 내부 정의
  function attachCapturingInterceptor() {
    document.addEventListener('click', (e) => {
      const target = e.target;
      const isQtyUpBtn = target.closest('a[href*="quantityUp"], img[alt*="수량증가"], .up, .qtyUp');
      if (!isQtyUpBtn) return;

      const qtyInput = target.closest('tr, .option_wrap, li')?.querySelector('input[id*="quantity"]');
      if (!qtyInput) return;

      const currentQty = parseInt(qtyInput.value, 10);
      // 옵션 추출 로직 (단일 상품 / 옵션 상품 분기 대응)
      let variantCode = null;
      const detailArea = document.querySelector('.xans-product-detail') || document;
      const addedOptions = Array.from(detailArea.querySelectorAll('input[id^="option_box"][id$="_id"]')).filter(input => input.id !== 'option_box_id');

      if (addedOptions.length > 0) {
        variantCode = addedOptions[addedOptions.length - 1].value;
      } else {
        const baseInput = detailArea.querySelector('input[name="option_box_id"]');
        if (baseInput) variantCode = baseInput.value;
      }

      const maxStock = globalStockMap[variantCode];

      // 💡 선제적 차단 및 커스텀 UI 강제 업데이트
      if (maxStock !== undefined && currentQty >= maxStock) {
        e.stopPropagation();
        e.preventDefault();

        console.log('[YKINAS Stockit] 최대 구매 수량 도달 - 카페24 네이티브 알럿 차단 완료');
        renderDynamicStockWidget(maxStock, currentQty + 1);
      }
    }, true); // UseCapture: true (가장 먼저 실행)
  }


  // 💡 [핵심 추가] 부트스트래퍼 관점의 네이티브 Alert 인터셉터
  function injectNativeAlertInterceptor() {
    if (global.__NEXUS_ALERT_INTERCEPTED__) return;
    global.__NEXUS_ALERT_INTERCEPTED__ = true;

    const originalAlert = global.alert;
    global.alert = function (message) {
      // 카페24 네이티브 초과 알럿 감지
      if (typeof message === 'string' && message.includes('재고수량 보다 많습니다')) {

        // 1. Event Bus를 통한 브로드캐스트 (타 모듈 확장 대비)
        const event = new CustomEvent('nexus:stock-over-limit');
        document.dispatchEvent(event);

        // 2. 강제로 OVER_LIMIT UI 렌더링 (원래 재고 + 1을 인위적으로 주입)
        if (currentTargetVariant && globalStockMap[currentTargetVariant] !== undefined) {
          const maxStock = globalStockMap[currentTargetVariant];
          renderDynamicStockWidget(maxStock, maxStock + 1);
        }

        // 선택 옵션: 기존 팝업을 안 띄우고 싶다면 여기서 return; (단, 스킨 호환성 테스트 필요)
        // return; 
      }
      return originalAlert.apply(this, arguments);
    };
  }


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

    // 💡 [핵심 추가] 카페24 글로벌 객체에서 현재 쇼핑몰 번호(shop_no) 추출 (기본값 1)
    const SHOP_NO = window.CAFE24?.GLOBAL_DATADIC?.shop_no || window.CAFE24API?.SHOP_NO || '1';

    // 💡 URL에 shop_no 쿼리 파라미터 탑재
    const proxyUrl = `https://ykinas-web.vercel.app/api/stockit?mall_id=${MALL_ID}&shop_no=${SHOP_NO}&product_no=${productNo}`;

    try {
      console.log(`[YKINAS Stockit] 📡 서버에 재고 데이터 요청 중... (상품번호: ${productNo}, 샵: ${SHOP_NO})`);
      const response = await fetch(proxyUrl, { method: 'GET' });
      const contentType = response.headers.get("content-type") || "";

      if (response.ok && contentType.includes("application/json")) {
        const data = await response.json();
        globalStockMap = data.stockMap || {};
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
    const detailArea = document.querySelector('.xans-product-detail') || document;
    const addedOptions = Array.from(detailArea.querySelectorAll('input[id^="option_box"][id$="_id"]'))
      .filter(input => input.id !== 'option_box_id');

    let targetVariantCode = null;
    let totalUserQtyForTarget = 1;

    if (addedOptions.length > 0) {
      const lastOption = addedOptions[addedOptions.length - 1];
      targetVariantCode = lastOption.value;
      totalUserQtyForTarget = 0;
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
      const baseInput = detailArea.querySelector('input[name="option_box_id"]');
      if (baseInput && baseInput.value) {
        targetVariantCode = baseInput.value;
        const qtyInput = detailArea.querySelector('input[id*="quantity"], input[name*="quantity"]');
        if (qtyInput) totalUserQtyForTarget = parseInt(qtyInput.value, 10) || 1;
      }
    }

    // 전역 변수에 현재 활성화된 옵션 코드 저장 (인터셉터에서 사용)
    currentTargetVariant = targetVariantCode;

    if (!targetVariantCode || globalStockMap[targetVariantCode] === undefined) return;

    // 정상적인 수량 변경 렌더링
    renderDynamicStockWidget(globalStockMap[targetVariantCode], totalUserQtyForTarget);
  }

  // 💡 [교체 영역] 7중 Fallback 상품번호 파서 및 안전 초기화 로직
  function extractProductNo() {
    // 1. 카페24 전역 변수
    if (window.iProductNo) return String(window.iProductNo);
    if (window.CAFE24?.GLOBAL_DATADIC?.product_no) return String(window.CAFE24.GLOBAL_DATADIC.product_no);

    // 2. URL 쿼리 파라미터 (?product_no= 형태)
    const urlParams = new URLSearchParams(window.location.search);
    const queryNo = urlParams.get('product_no');
    if (queryNo) return queryNo;

    // 3. DOM 폼 내부 hidden input
    const hiddenInput = document.querySelector('input[name="product_no"], #product_no');
    if (hiddenInput && hiddenInput.value) return hiddenInput.value;

    // 4. OpenGraph 메타 태그
    const metaTag = document.querySelector('meta[property="product:productId"]');
    if (metaTag && metaTag.content) return metaTag.content;

    // 5. SEO 친화적 URL Path (/product/상품명/번호/...)
    const match = window.location.pathname.match(/\/product\/[^\/]+\/(\d+)/);
    if (match && match[1]) return match[1];

    // 6. 단순 Path 끝자리 매칭 (/product/번호)
    const simpleMatch = window.location.pathname.match(/\/product\/.*?(\d+)/);
    if (simpleMatch && simpleMatch[1]) return simpleMatch[1];

    return null;
  }

  function initModule() {
    // 상세 페이지 영역이 전혀 없다면 에러 없이 조용히 종료
    const isProductPage = window.location.pathname.includes('/product/') ||
      window.location.search.includes('product_no=') ||
      !!document.querySelector('.xans-product-detail');
    if (!isProductPage) return;

    let productNo = extractProductNo();

    // 카페24 DOM/변수 바인딩 지연 시 100ms 뒤 1회 재시도 (비동기 방어)
    if (!productNo) {
      setTimeout(() => {
        productNo = extractProductNo();
        if (productNo) startStockit(productNo);
      }, 100);
      return;
    }

    startStockit(productNo);
  }

  function startStockit(productNo) {
    preFetchAllInventory(productNo);

    attachCapturingInterceptor();

    
    injectNativeAlertInterceptor(); // 인터셉터 주입

    const observeTarget = document.querySelector('.xans-product-detail') || document.body;
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      mutations.forEach(m => { if (m.type === 'childList') shouldUpdate = true; });
      if (shouldUpdate) instantCheckOptions();
    });
    observer.observe(observeTarget, { childList: true, subtree: true });

    observeTarget.addEventListener('input', (e) => {
      window.event = window.event || e;
      if (!e && !window.event) return;
      const target = e.target || window.event.srcElement;
      if (!target) return;

      if (target.tagName === 'INPUT' && (target.id?.includes('quantity') || target.name?.includes('quantity'))) {
        setTimeout(() => {
          try { instantCheckOptions(); } catch (err) { }
        }, 0);
      }
    });

    observeTarget.addEventListener('click', (e) => {
      window.event = window.event || e;
      if (!e && !window.event) return;
      const target = e.target || window.event.srcElement;
      if (!target) return;

      setTimeout(() => {
        try { instantCheckOptions(); } catch (err) { }
      }, 50);
    });

    // 💡 인터셉터에서 발생시킨 커스텀 이벤트 리스닝
    document.addEventListener('nexus:stock-over-limit', () => {
      console.warn('[YKINAS Stockit] 최대 구매 수량 도달 감지됨. UI를 강제 업데이트합니다.');
      // UI 복구를 위해 3초 뒤 다시 원래 상태(CRITICAL 등)로 되돌리는 시각적 피드백 옵션 추가 가능
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initModule);
  else initModule();
})(window);