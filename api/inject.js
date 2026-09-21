// api/inject.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  // 💡 인젝트 스크립트 캐싱 최적화
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  const { mall_id } = req.query;
  const referer = req.headers.referer || req.headers.origin || '';

  let requestHost = '';
  if (referer) {
    try {
      requestHost = new URL(referer).hostname;
    } catch (e) {
      // 파싱 실패 시 조용히 넘어감
    }
  }

  if (!mall_id) {
    return res.status(200).send('console.warn("[YKINAS] mall_id is required for bootstrapping.");');
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: license, error } = await supabase
      .from('skin_licenses')
      .select('is_active, modules_config, skin_allowed_domains(domain)')
      .eq('mall_id', mall_id)
      .maybeSingle();

    const isDomainMatched = license?.skin_allowed_domains?.some(d => 
      requestHost === d.domain || requestHost.endsWith('.' + d.domain)
    );

    // 라이선스 만료 또는 미인가 도메인 차단
    if (error || !license || !license.is_active || (requestHost && !isDomainMatched)) {
      return res.status(200).send(`console.warn("[YKINAS Bootstrapper] Unauthorized domain (${requestHost}) or inactive license.");`);
    }

    const config = license.modules_config || {};
    const baseUrl = 'https://ykinas-web.vercel.app/modules'; 

    // 💡 프론트엔드 주입용 런타임 스크립트 (Graceful Fallback 적용)
    const loaderScript = `
      (function(global) {
        if (global.__YKINAS_BOOTSTRAPPER_LOADED__) return;
        global.__YKINAS_BOOTSTRAPPER_LOADED__ = true;

        const modulesConfig = ${JSON.stringify(config)};
        const baseUrl = '${baseUrl}';

        function injectModule(moduleName, moduleConfig) {
          const script = document.createElement('script');
          script.src = baseUrl + '/' + moduleName + '.js'; 
          script.defer = true;
          script.dataset.config = JSON.stringify(moduleConfig); 
          
          script.onload = function() {
            console.log('%c[YKINAS] ✨ ' + moduleName + ' loaded.', 'color: #3b82f6;');
          };
          
          script.onerror = function() {
            // 파일을 찾을 수 없는 경우 경고만 띄우고 다른 스크립트 실행을 방해하지 않음
            console.warn('[YKINAS] ⚠️ Module file not found on server: ' + moduleName + '.js');
          };
          
          document.head.appendChild(script);
        }

        // 활성화된 모듈만 필터링하여 순차 주입
        Object.keys(modulesConfig).forEach(function(moduleName) {
          const moduleConfig = modulesConfig[moduleName];
          if (moduleConfig && moduleConfig.enabled) {
            injectModule(moduleName, moduleConfig);
          }
        });
      })(window);
    `;

    return res.status(200).send(loaderScript);

  } catch (error) {
    console.error('[YKINAS API Error]', error);
    return res.status(500).send('console.error("[YKINAS Bootstrapper] Internal server error.");');
  }
}