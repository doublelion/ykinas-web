import { createClient } from '@supabase/supabase-js';

// 💡 관리자 권한(service_role_key)을 사용하여 RLS 정책을 안전하게 우회합니다.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // CORS 처리
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { mall_id, is_active, deletedItemIds, items } = req.body;

  if (!mall_id) {
    return res.status(400).json({ error: 'Mall ID is required.' });
  }

  try {
    // 1. 캠페인 활성화 상태 업데이트
    const { data: campaignData, error: campaignError } = await supabase
      .from('bannerit_campaigns')
      .upsert({ mall_id, is_active }, { onConflict: 'mall_id' })
      .select()
      .single();

    if (campaignError) throw campaignError;

    // 2. 삭제된 슬라이드 아이템 DB에서 제거
    if (deletedItemIds && deletedItemIds.length > 0) {
      await supabase.from('bannerit_items').delete().in('id', deletedItemIds);
    }

    // 3. 신규 및 수정된 슬라이드 아이템 저장
    if (items && items.length > 0) {
      const payload = items.map(item => ({
        campaign_id: campaignData.id,
        id: item.id || undefined, // 신규 생성 시 undefined
        image_url: item.image_url,
        title: item.title,
        subtitle: item.subtitle,
        cta_text: item.cta_text,
        cta_link: item.cta_link,
        sort_order: item.sort_order
      }));

      const { error: itemsError } = await supabase.from('bannerit_items').upsert(payload);
      if (itemsError) throw itemsError;
    }

    return res.status(200).json({ success: true, message: 'Saved successfully.' });
  } catch (error) {
    console.error('[BannerIt Admin] Save Error:', error);
    return res.status(500).json({ error: 'Database update failed.' });
  }
}