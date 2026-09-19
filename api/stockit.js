// api/inject.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  // Inject 스크립트는 60초 캐싱 유지 (성능 최적화 목적, 문제 없음)
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  const { mall_id } = req.query;
  const referer = req.headers.referer || req.headers.origin || '';

  // 💡 [안전 장치 추가] referer가 빈 문자열일 때 new URL()이 던지는 Exception 방어
  let requestHost = '';
  if (referer) {
    try {
      requestHost = new URL(referer).hostname;
    } catch (e) {
      console.error('[YKINAS Bootstrapper] URL Parsing failed for referer:', referer);
    }
  }

  if (!mall_id) {
    return res.status(200).send('console.warn("[YKINAS Bootstrapper] mall_id is required.");');
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: license, error } = await supabase
      .from('skin_licenses')
      .select('is_active, modules_config, skin_allowed_domains(domain)')
      .eq('mall_id', mall_id)
      .maybeSingle();

    // 빈 requestHost(직접 URL 치고 접속한 경우 등)일 때는 느슨하게 허용하거나,
    // 엄격하게 관리하려면 requestHost가 반드시 있어야 동작하게 처리. (현재는 화이트리스트 검사)
    const isDomainMatched = license?.skin_allowed_domains?.some(d => 
      requestHost === d.domain || requestHost.endsWith('.' + d.domain)
    );

    if (error || !license || !license.is_active || (requestHost && !isDomainMatched)) {
      return res.status(200).send(`console.warn("[YKINAS Bootstrapper] Unauthorized domain (${requestHost}) or inactive license.");`);
    }

    const config = license.modules_config || {};
    const baseUrl = 'https://ykinas-web.vercel.app/modules'; 

    const loaderScript = `
      (function(global) {
        if (global.__YKINAS_NEXTGEN_BOOTSTRAPPER_LOADED__) return;
        global.__YKINAS_NEXTGEN_BOOTSTRAPPER_LOADED__ = true;

        const modulesConfig = ${JSON.stringify(config)};
        const baseUrl = '${baseUrl}';

        function injectModule(moduleName, moduleConfig) {
          const script = document.createElement('script');
          script.src = baseUrl + '/' + moduleName + '.js'; 
          script.defer = true;
          script.dataset.config = JSON.stringify(moduleConfig); 
          
          script.onerror = function() {
            console.error('[YKINAS] Failed to load module: ' + moduleName);
          };
          
          document.head.appendChild(script);
        }

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
    return res.status(500).send('console.error("[YKINAS Bootstrapper] Server error.");');
  }
}