(function (global) {
  // 1. 중복 실행 방지 (Idempotency) - 카페24 스킨에서 스크립트가 여러 번 로드되는 상황 방어
  if (global.__YKINAS_STOCK_LOADED__) return;
  global.__YKINAS_STOCK_LOADED__ = true;

  // 2. 부트스트래퍼(commerce.js)가 넘겨준 설정값(config) 안전하게 파싱
  const currentScript = document.currentScript;
  let config = {};
  try {
    config = currentScript && currentScript.dataset.config ? JSON.parse(currentScript.dataset.config) : {};
  } catch (e) {
    console.error('[YKINAS] Stock Indicator config parsing error', e);
  }

  // 3. 코어 렌더링 로직 (바닐라 JS)
  function renderStockWidget() {
    // 카페24 상품 상세 페이지 타겟팅 (보편적인 클래스 사용, 없으면 조기 종료)
    const targetArea = document.querySelector('.xans-product-detail') || document.querySelector('.xans-product-info');
    if (!targetArea) return;

    // 이미 주입된 위젯이 있는지 이중 체크
    if (document.getElementById('ykinas-stock-widget-container')) return;

    // 컨테이너 생성
    const container = document.createElement('div');
    container.id = 'ykinas-stock-widget-container';

    // ⭐ Shadow DOM 생성 (호스트 쇼핑몰의 강력한 CSS로부터 스타일을 완벽히 격리)
    const shadowRoot = container.attachShadow({ mode: 'open' });

    // DB에서 가져온 커스텀 설정값 매핑 (기본값 폴백 처리)
    const bgColor = config.bgColor || '#ffe3e3';
    const textColor = config.textColor || '#fa5252';

    shadowRoot.innerHTML = `
    `;

    // 상품 상세 영역의 끝부분(또는 특정 위치)에 안전하게 삽입
    targetArea.insertAdjacentElement('beforeend', container);

  }

  // 4. 안전한 실행 타이밍 제어 (렌더링 블로킹 방지)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderStockWidget);
  } else {
    // 이미 DOM이 준비된 상태라면 즉시 실행
    renderStockWidget();
  }
})(window);