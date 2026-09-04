import { createClient } from '@supabase/supabase-js';

// 💡 반드시 관리자 키(SERVICE_ROLE_KEY)를 사용해야 RLS 정책을 우회하여 저장할 수 있습니다.
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
    const { data: campaignData, error: campaignError } = await supabase
      .from('bannerit_campaigns')
      .upsert({ mall_id, is_active }, { onConflict: 'mall_id' })
      .select().single();
    if (campaignError) throw campaignError;

    if (deletedItemIds && deletedItemIds.length > 0) {
      await supabase.from('bannerit_items').delete().in('id', deletedItemIds);
    }

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
    console.error(error);
    return res.status(500).json({ error: 'Database Update Failed' });
  }
}