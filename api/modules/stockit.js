import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { mall_id } = req.query;

  if (!mall_id) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return res.status(200).send('console.warn("[YKINAS] mall_id missing.");');
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase
      .from('skin_licenses')
      .select('modules_config')
      .eq('mall_id', mall_id)
      .single();

    if (error) throw error;

    const config = data?.modules_config?.stock_indicator || { enabled: false };

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');

    if (!config.enabled) {
      return res.status(200).send('/* YKINAS Stock Indicator: Disabled */');
    }

    // 서버 사이드에서 JS 문자열 렌더링 (DOM Cascade & Minimal UI 적용)
    const scriptContent = `
  (function (global) {
    if (global.__YKINAS_STOCK_LOADED__) return;
    global.__YKINAS_STOCK_LOADED__ = true;

    // DB 설정값이 없으면, 미니멀 디자인 기본값 적용
    const config = ${JSON.stringify(config)};
    const bgColor = config.bgColor || '#f8f9fa';
    const borderColor = config.borderColor || '#e9ecef';
    const textColor = config.textColor || '#333333';
    const pointColor = config.pointColor || '#ff6b6b'; // 맥박 애니메이션 포인트 컬러

    // [핵심] 호스트 쇼핑몰 DOM 구조 파편화 대응 (Cascade Pattern)
    function findTargetPlacement() {
      // 1순위: 총 결제금액 상단 (구매 전환율이 가장 높은 최적의 위치)
      const priceArea = document.querySelector('.xans-product-detail .totalPrice') || document.querySelector('#totalPrice');
      if (priceArea) return { element: priceArea, position: 'beforebegin' };

      // 2순위: 상품 정보 영역 (infoArea) 하단
      const infoArea = document.querySelector('.infoArea') || document.querySelector('.xans-product-info');
      if (infoArea) return { element: infoArea, position: 'beforeend' };

      // 3순위: 상품 상세 전체 래퍼 하단 (최후의 보루)
      const detailArea = document.querySelector('.xans-product-detail');
      if (detailArea) return { element: detailArea, position: 'beforeend' };

      return null; // 타겟을 찾지 못함 (예외 처리)
    }

    function renderStockWidget() {
      if (document.getElementById('ykinas-stock-widget-container')) return;

      const target = findTargetPlacement();
      if (!target) return; // 주입할 위치가 없으면 안전하게 렌더링 취소

      const container = document.createElement('div');
      container.id = 'ykinas-stock-widget-container';
      
      // Shadow DOM으로 캡슐화하여 쇼핑몰 CSS와 완벽 격리
      const shadowRoot = container.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = \`
        <style>
          .ykinas-stock-badge {
            display: inline-flex; 
            align-items: center; 
            padding: 14px 16px;
            background-color: \${bgColor}; 
            border: 1px solid \${borderColor};
            color: \${textColor};
            border-radius: 4px; 
            font-size: 13px;
            font-weight: 500;
            letter-spacing: -0.5px;
            margin: 10px 0 20px 0; 
            width: 100%; 
            box-sizing: border-box; 
            font-family: 'Pretendard', 'Malgun Gothic', sans-serif;
            box-shadow: 0 1px 2px rgba(0,0,0,0.02);
          }
          .ykinas-pulse {
            width: 6px; 
            height: 6px; 
            background-color: \${pointColor};
            border-radius: 50%; 
            margin-right: 10px; 
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 \${pointColor}80; }
            70% { transform: scale(1); box-shadow: 0 0 0 6px \${pointColor}00; }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 \${pointColor}00; }
          }
          .ykinas-text {
            opacity: 0.9;
          }
        </style>
        <div class="ykinas-stock-badge">
          <span class="ykinas-pulse"></span>
          <span class="ykinas-text">품절 임박! 현재 소량의 재고만 남아있습니다.</span>
        </div>
      \`;
      
      // 동적으로 찾은 위치에 안전하게 삽입
      target.element.insertAdjacentElement(target.position, container);
    }

    const observer = new MutationObserver((mutations, obs) => {
      if (findTargetPlacement()) {
        renderStockWidget();
        obs.disconnect(); 
      }
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderStockWidget);
    } else {
      renderStockWidget();
    }
    
    observer.observe(document.body, { childList: true, subtree: true });
  })(window);
`;

    return res.status(200).send(scriptContent);
  } catch (error) {
    console.error('[YKINAS API Error]', error);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return res.status(500).send('console.error("[YKINAS] Module load failed.");');
  }
}