// api/stockit.js (Vercel Serverless Function - Proxy)
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS 허용 (위젯이 브라우저에서 찌를 수 있도록)
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { mall_id, product_no, variant_code } = req.query;

  if (!mall_id || !product_no || !variant_code) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // 1. 이미 저장되어 있는 카페24 Admin Access Token 조회
    const { data: auth, error } = await supabase
      .from('cafe24_auth_tokens')
      .select('access_token')
      .eq('mall_id', mall_id)
      .maybeSingle();

    if (error || !auth || !auth.access_token) {
      return res.status(401).json({ error: 'No admin token found in DB' });
    }

    // 2. 백엔드에서 안전하게 카페24 Admin API 호출
    const url = `https://${mall_id}.cafe24api.com/api/v2/products/${product_no}/variants/${variant_code}/inventories`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${auth.access_token}`, // 강력한 어드민 토큰 사용
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2025-12-01'
      }
    });

    if (!response.ok) {
      console.error(`[Cafe24 API Error] ${response.status}`);
      return res.status(response.status).json({ error: 'Cafe24 API request failed' });
    }

    const data = await response.json();

    // 3. 민감한 정보는 다 버리고 딱 '재고 수량'만 프론트엔드로 반환
    return res.status(200).json({ quantity: data.inventory.quantity });

  } catch (error) {
    console.error('[Proxy Error]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}