// api/stockit.js (Vercel Serverless Function 예시)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  // 1. CORS 설정 (프론트엔드 호출 허용)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { mall_id, product_no, variant_code } = req.query;

  if (!mall_id || !product_no || !variant_code) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // 2. Supabase에서 해당 mall_id의 Access Token 조회 (테이블명은 실제 환경에 맞게 수정)
    const { data: storeData, error: dbError } = await supabase
      .from('cafe24_tokens') // 또는 skin_licenses 등 토큰이 저장된 테이블
      .select('access_token')
      .eq('mall_id', mall_id)
      .single();

    if (dbError || !storeData?.access_token) {
      return res.status(401).json({ error: 'No valid token found for this mall.' });
    }

    // 3. 카페24 Admin API 호출 (재고 조회)
    const cafe24Url = `https://${mall_id}.cafe24api.com/api/v2/admin/products/${product_no}/variants/${variant_code}/inventory`;
    
    const cafe24Res = await fetch(cafe24Url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${storeData.access_token}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2025-12-01' 
      }
    });

    if (!cafe24Res.ok) {
      // 401 에러라면 토큰이 만료된 것일 수 있음 (cron-refresh-tokens 작동 확인 필요)
      return res.status(cafe24Res.status).json({ error: `Cafe24 API Error: ${cafe24Res.statusText}` });
    }

    const cafe24Data = await cafe24Res.json();
    
    // 4. 프론트로 필요한 데이터만 정제하여 응답
    const quantity = cafe24Data.inventory?.inventory_quantity || 0;
    return res.status(200).json({ quantity });

  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}