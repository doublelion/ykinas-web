import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { mall_id, is_active, deletedItemIds, items } = req.body;

  try {
    // 🚨 [긴급 패치] 외래 키(FK) 에러 방어 로직 추가
    // bannerit_campaigns 저장 전, 부모 테이블인 skin_licenses에 해당 mall_id가 무조건 존재하도록 보장합니다.
    const { error: licenseError } = await supabase
      .from('skin_licenses')
      .upsert(
        { mall_id, is_active: true, has_bannerit_module: true },
        { onConflict: 'mall_id' }
      );
    if (licenseError) throw licenseError;

    // 1. 캠페인 활성화 상태 업데이트
    const { data: campaignData, error: campaignError } = await supabase
      .from('bannerit_campaigns')
      .upsert({ mall_id, is_active }, { onConflict: 'mall_id' })
      .select().single();
    if (campaignError) throw campaignError;

    // 2. 삭제된 슬라이드 아이템 제거
    if (deletedItemIds && deletedItemIds.length > 0) {
      await supabase.from('bannerit_items').delete().in('id', deletedItemIds);
    }

    // 3. 신규 및 수정된 슬라이드 아이템 저장
    if (items && items.length > 0) {
      const payload = items.map(item => ({
        campaign_id: campaignData.id,
        ...item
      }));
      const { error: itemsError } = await supabase.from('bannerit_items').upsert(payload);
      if (itemsError) throw itemsError;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Save Error Details]:', error);
    return res.status(500).json({ error: error.message || 'Database Update Failed' });
  }
}