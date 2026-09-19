// api/stockit.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  // 💡 [핵심 교정 1] 결제 시 실시간 재고 반영을 위한 강력한 캐시 방어
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { mall_id, product_no } = req.query;
  const referer = req.headers.referer || req.headers.origin || '';

  let requestHost = '';
  if (referer) {
    try { requestHost = new URL(referer).hostname; } catch (e) {}
  }

  if (!mall_id || !product_no) return res.status(400).json({ error: 'BAD_REQUEST', message: '파라미터 누락' });

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: license, error: licenseError } = await supabase
      .from('skin_licenses')
      .select('is_active, modules_config, skin_allowed_domains(domain)')
      .eq('mall_id', mall_id)
      .maybeSingle();

    if (licenseError || !license || !license.is_active) return res.status(403).json({ error: 'FORBIDDEN' });
    
    const isDomainMatched = license.skin_allowed_domains?.some(d => requestHost === d.domain || requestHost.endsWith('.' + d.domain));
    // 개발/테스트 환경 예외 처리를 위해 referer가 없는 경우 느슨한 허용(또는 차단) 정책 적용 가능
    if (requestHost && !isDomainMatched) return res.status(403).json({ error: 'FORBIDDEN' });
    
    const config = license.modules_config || {};
    if (!config.stockit || config.stockit.enabled !== true) return res.status(403).json({ error: 'FORBIDDEN' });

    const { data: tokenData } = await supabase.from('cafe24_auth_tokens').select('access_token').eq('mall_id', mall_id).single();
    if (!tokenData) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const cafe24Res = await fetch(`https://${mall_id}.cafe24api.com/api/v2/admin/products/${product_no}/variants?embed=inventories`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2025-12-01' // 히스토리 기반 명시적 버전
      }
    });

    if (!cafe24Res.ok) throw new Error(`Cafe24 API Error: ${cafe24Res.status}`);

    const cafe24Data = await cafe24Res.json();
    const variants = cafe24Data.variants || [];

    const stockMap = {};
    variants.forEach(variant => {
      if (!variant.variant_code) return;
      
      let qty = 0;
      const invData = variant.inventories || variant.inventory;

      // 💡 [핵심 교정 2] 다중 타입(Array/Object) 파싱 방어
      if (invData) {
        if (Array.isArray(invData) && invData.length > 0) {
          qty = invData[0].available_inventory ?? invData[0].quantity ?? 0;
        } else if (typeof invData === 'object' && !Array.isArray(invData)) {
          qty = invData.available_inventory ?? invData.quantity ?? 0;
        }
      } else {
        qty = variant.available_inventory ?? variant.quantity ?? 0;
      }

      // 💡 [핵심 교정 3] 비즈니스 로직 적용: 순수 재고 - 안전 재고 = 실 판매가능 재고
      const safety = variant.safety_inventory || 0;
      qty = Math.max(0, qty - safety);
      
      // 💡 [핵심 교정 4] T/F vs true/false 혼용 완벽 대응 및 진열/판매 상태 검증
      const isDisplay = variant.display === 'T' || variant.display === true;
      const isSelling = variant.selling === 'T' || variant.selling === true;
      if (!isDisplay || !isSelling) qty = 0;

      // 💡 [핵심 교정 5] 재고관리 사용 안함('F')일 경우 무제한(99999) 처리
      const useInventory = variant.use_inventory === 'T' || variant.use_inventory === true;
      if (!useInventory && variant.use_inventory !== undefined) qty = 99999;
      
      stockMap[variant.variant_code] = parseInt(qty, 10) || 0;
    });

    return res.status(200).json({ success: true, stockMap });

  } catch (err) {
    console.error('[YKINAS API Error]', err);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
}