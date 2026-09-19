// api/stockit.js (Vercel Serverless Function - E2E Complete Version)
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { mall_id, product_no } = req.query;
  const referer = req.headers.referer || req.headers.origin || '';

  if (!mall_id || !product_no) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: '파라미터 누락' });
  }

  let requestHost = '';
  try {
    if (referer) requestHost = new URL(referer).hostname;
  } catch (e) {
    return res.status(403).json({ error: 'FORBIDDEN', message: '잘못된 접근 출처' });
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // [1단계] 라이선스, JSONB 설정, 도메인 검증
    const { data: license, error: licenseError } = await supabase
      .from('skin_licenses')
      .select('is_active, modules_config, skin_allowed_domains(domain)')
      .eq('mall_id', mall_id)
      .maybeSingle();

    if (licenseError || !license || !license.is_active) {
      return res.status(403).json({ error: 'FORBIDDEN', message: '유효하지 않은 라이선스입니다.' });
    }

    const isDomainMatched = license.skin_allowed_domains?.some(d =>
      requestHost === d.domain || requestHost.endsWith('.' + d.domain)
    );
    if (requestHost && !isDomainMatched) {
      return res.status(403).json({ error: 'FORBIDDEN', message: '등록되지 않은 도메인입니다.' });
    }

    const config = license.modules_config || {};
    if (!config.stockit || config.stockit.enabled !== true) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Stockit 모듈이 비활성화 상태입니다.' });
    }

    // [2단계] 카페24 액세스 토큰 획득
    const { data: tokenData, error: tokenError } = await supabase
      .from('cafe24_auth_tokens')
      .select('access_token')
      .eq('mall_id', mall_id)
      .single();

    if (tokenError || !tokenData) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: '인증 토큰이 없습니다.' });
    }

    // [3단계] 카페24 실시간 재고 데이터 페칭 (축약 해제 및 복원)
    const cafe24Res = await fetch(`https://${mall_id}.cafe24api.com/api/v2/admin/products/${product_no}/variants?embed=inventories`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2025-12-01'
      }
    });

    if (!cafe24Res.ok) {
      throw new Error(`Cafe24 API Error: ${cafe24Res.status}`);
    }

    const cafe24Data = await cafe24Res.json();
    const variants = cafe24Data.variants || [];

    // [4단계] 옵션 코드 기준 가용 재고량(Available Inventory) 매핑
    const stockMap = {};
    variants.forEach(variant => {
      if (variant.variant_code && variant.inventories && variant.inventories.length > 0) {
        stockMap[variant.variant_code] = variant.inventories[0].available_inventory || 0;
      }
    });

    // 최종 결과 JSON 반환
    return res.status(200).json({ success: true, stockMap });

  } catch (err) {
    console.error('[YKINAS API Error]', err);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: '서버 내부 오류' });
  }
}