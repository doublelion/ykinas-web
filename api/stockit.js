// api/stockit.js (Vercel Serverless Function - Multi-type Parser Applied)
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
    
    // 1. JSONB 라이선스 및 도메인 검증
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

    // Cafe24 Admin API 호출 (inventories Embed)
    const cafe24Res = await fetch(`https://${mall_id}.cafe24api.com/api/v2/admin/products/${product_no}/variants?embed=inventories`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2025-12-01'
      }
    });

    if (!cafe24Res.ok) throw new Error(`Cafe24 API Error: ${cafe24Res.status}`);

    const cafe24Data = await cafe24Res.json();
    const variants = cafe24Data.variants || [];

    // 💡 3. E2E 대응 강력한 폴백(Fallback) 다중 타입 파서
    const stockMap = {};
    variants.forEach(variant => {
      if (!variant.variant_code) return;
      
      let qty = 0;

      // 버전이나 옵션에 따라 'inventories'(배열/객체) 또는 'inventory'(객체)로 다르게 올 수 있음
      const invData = variant.inventories || variant.inventory;

      if (invData) {
        if (Array.isArray(invData) && invData.length > 0) {
          // Case A: 배열로 내려올 때
          qty = invData[0].available_inventory ?? invData[0].quantity ?? 0;
        } else if (typeof invData === 'object' && !Array.isArray(invData)) {
          // Case B: 단일 객체로 내려올 때 (기존에 여기서 length 검사에 막혀 우회되었음)
          qty = invData.available_inventory ?? invData.quantity ?? 0;
        }
      } else {
        // Case C: Embed 데이터가 없을 때 자체 quantity 참조
        qty = variant.available_inventory ?? variant.quantity ?? 0;
      }

      // 💡 [비즈니스 로직 방어] 진열안함(F) 이거나 판매안함(F)인 품목은 실제 DB상 재고가 있어도 0으로 강제 처리
      if (variant.display === 'F' || variant.selling === 'F') {
        qty = 0;
      }
      
      // 프론트엔드 연산을 위해 안전한 정수형(Number)으로 변환 후 할당
      stockMap[variant.variant_code] = parseInt(qty, 10) || 0;
    });

    return res.status(200).json({ success: true, stockMap });

  } catch (err) {
    console.error('[YKINAS API Error]', err);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
}