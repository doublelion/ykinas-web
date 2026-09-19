// api/stockit.js (Vercel Serverless Function - Data Mapping Fix)
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { mall_id, product_no } = req.query;
  const referer = req.headers.referer || req.headers.origin || '';

  if (!mall_id || !product_no) return res.status(400).json({ error: 'BAD_REQUEST', message: '파라미터 누락' });

  let requestHost = '';
  try { if (referer) requestHost = new URL(referer).hostname; } catch (e) {}

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // 1. JSONB 라이선스 및 도메인 검증 (완벽 작동 중)
    const { data: license, error: licenseError } = await supabase
      .from('skin_licenses')
      .select('is_active, modules_config, skin_allowed_domains(domain)')
      .eq('mall_id', mall_id)
      .maybeSingle();

    if (licenseError || !license || !license.is_active) return res.status(403).json({ error: 'FORBIDDEN' });
    
    const isDomainMatched = license.skin_allowed_domains?.some(d => requestHost === d.domain || requestHost.endsWith('.' + d.domain));
    if (requestHost && !isDomainMatched) return res.status(403).json({ error: 'FORBIDDEN' });
    
    const config = license.modules_config || {};
    if (!config.stockit || config.stockit.enabled !== true) return res.status(403).json({ error: 'FORBIDDEN' });

    // 2. 토큰 추출 및 카페24 API 호출
    const { data: tokenData } = await supabase.from('cafe24_auth_tokens').select('access_token').eq('mall_id', mall_id).single();
    if (!tokenData) return res.status(401).json({ error: 'UNAUTHORIZED' });

    // ✅ 수정된 코드 (embed=inventories 추가하여 옵션별 실시간 재고를 정확히 추출)
    const cafe24Res = await fetch(`https://${mall_id}.cafe24api.com/api/v2/admin/products/${product_no}/variants?embed=inventories`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        // 사전에 정의된 안정적인 API 버전을 명시적으로 사용합니다.
        'X-Cafe24-Api-Version': '2025-12-01' 
      }
    });

    if (!cafe24Res.ok) throw new Error(`Cafe24 API Error: ${cafe24Res.status}`);

    const cafe24Data = await cafe24Res.json();
    const variants = cafe24Data.variants || [];

    // 💡 3. 강력한 폴백(Fallback) 파서 (기존과 동일하게 유지)
    const stockMap = {};
    variants.forEach(variant => {
      if (!variant.variant_code) return;
      
      let qty = 0;
      if (variant.inventories && variant.inventories.length > 0) {
        qty = variant.inventories[0].available_inventory ?? variant.inventories[0].quantity ?? 0;
      } else {
        qty = variant.available_inventory ?? variant.quantity ?? 0;
      }
      
      stockMap[variant.variant_code] = qty;
    });

    return res.status(200).json({ success: true, stockMap });

  } catch (err) {
    console.error('[YKINAS API Error]', err);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
}