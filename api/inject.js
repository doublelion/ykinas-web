import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=0, must-revalidate');
    res.setHeader('X-Cafe24-Api-Version', '2025-12-01');

    const clientReferer = req.headers['referer'] || '';
    const clientMallId = req.query.mall_id;

    // 모듈 권한 없음/에러 시 공통적으로 주입될 스크립트 (기존 로직 유지)
    const sendDisabledScript = (reason) => {
      return res.status(200).send(`
        (function() {
          console.warn('[YKINAS Modules] Disabled: ${reason}');
          // SignIt 클린업
          if (window.YkinasLogin) {
            window.YkinasLogin.open = function() {};
            window.YkinasLogin.close = function() {};
          }
          const existingHost = document.getElementById('ykinas-global-drawer-root');
          if (existingHost) existingHost.remove();
          const existingIframe = document.getElementById('ykinas_proxy_iframe');
          if (existingIframe) existingIframe.remove();
        })();
      `);
    };

    if (!clientMallId || clientMallId === '{$mall_id}') {
      return sendDisabledScript('Mall ID is missing or invalid placeholder.');
    }

    // DB 조회: 새롭게 추가된 modules_config(JSONB) 포함
    const { data: license, error } = await supabase
      .from('skin_licenses')
      .select('id, is_active, modules_config, skin_allowed_domains ( domain )')
      .eq('mall_id', clientMallId)
      .maybeSingle();

    if (error || !license || !license.is_active) {
      return sendDisabledScript('Unauthorized or invalid license.');
    }

    // 도메인 검증 로직 (기존 코드 완벽 유지)
    const allowedDomains = license.skin_allowed_domains ? license.skin_allowed_domains.map(d => d.domain) : [];
    const isDomainMatch = allowedDomains.length === 0 || allowedDomains.some(domain => clientReferer.includes(domain)) || clientReferer === '';

    if (!isDomainMatch) {
      return sendDisabledScript('Domain mismatch.');
    }

    const config = license.modules_config || {};
    const baseUrl = 'https://ykinas-web.vercel.app/modules';

    // 통합 로더 스크립트 생성 (브라우저에서 실행됨)
    const injectedScript = `
      (function(global) {
        if (global.__YKINAS_BOOTSTRAPPER_LOADED__) return;
        global.__YKINAS_BOOTSTRAPPER_LOADED__ = true;

        const mallConfig = ${JSON.stringify(config)};
        const baseUrl = '${baseUrl}';

        function loadModule(moduleName, moduleConfig) {
          const script = document.createElement('script');
          script.src = baseUrl + '/' + moduleName + '.js';
          script.defer = true;
          // 개별 모듈로 설정값 전달
          script.dataset.config = JSON.stringify(moduleConfig);
          script.onerror = function() {
            console.error('[YKINAS] Failed to load module: ' + moduleName);
          };
          document.body.appendChild(script);
        }

        // 활성화된 모듈만 자동 주입
        Object.keys(mallConfig).forEach(function(moduleName) {
          const moduleConfig = mallConfig[moduleName];
          if (moduleConfig && moduleConfig.enabled) {
            loadModule(moduleName, moduleConfig);
          }
        });
      })(window);
    `;

    return res.status(200).send(injectedScript);
  } catch (err) {
    console.error(err);
    return res.status(500).send('console.error("[YKINAS] Initialization error");');
  }
}