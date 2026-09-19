// api/stockit.js (Vercel Backend)
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { mall_id, product_no, variant_code } = req.query;

    if (!mall_id || !product_no || !variant_code) {
      return res.status(400).json({ error: '필수 파라미터 누락' });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: storeData, error: dbError } = await supabase
      .from('cafe24_auth_tokens')
      .select('access_token')
      .eq('mall_id', mall_id)
      .single();

    if (dbError || !storeData?.access_token) {
      return res.status(401).json({ error: '유효한 액세스 토큰 없음' });
    }

    // 💡 [해결 핵심] API 명세서에 따라 끝자리를 'inventory'에서 'inventories'로 변경
    const cafe24Url = `https://${mall_id}.cafe24api.com/api/v2/admin/products/${product_no}/variants/${variant_code}/inventories`;
    
    const cafe24Res = await fetch(cafe24Url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${storeData.access_token}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2025-12-01'
      }
    });

    if (!cafe24Res.ok) {
      const errorText = await cafe24Res.text();
      return res.status(cafe24Res.status).json({ error: `Cafe24 API Error: ${errorText}` });
    }

    const cafe24Data = await cafe24Res.json();
    
    // 💡 응답 객체가 inventory 또는 inventories 일 경우를 모두 대비한 안전한 데이터 추출
    const targetObj = cafe24Data.inventory || cafe24Data.inventories || {};
    const quantity = targetObj.inventory_quantity ?? 0;

    return res.status(200).json({ quantity });

  } catch (error) {
    console.error('[Stockit API Error]', error.message);
    return res.status(500).json({ error: error.message });
  }
}