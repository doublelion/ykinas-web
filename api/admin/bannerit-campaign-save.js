import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto'; // 💡 Vercel Node.js 환경에서 기본 제공되는 내장 모듈입니다.

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
    const { error: licenseError } = await supabase
      .from('skin_licenses')
      .upsert(
        { mall_id, is_active: true, has_bannerit_module: true },
        { onConflict: 'mall_id' }
      );
    if (licenseError) throw licenseError;

    const { data: campaignData, error: campaignError } = await supabase
      .from('bannerit_campaigns')
      .upsert({ mall_id, is_active }, { onConflict: 'mall_id' })
      .select().single();
    if (campaignError) throw campaignError;

    if (deletedItemIds && deletedItemIds.length > 0) {
      await supabase.from('bannerit_items').delete().in('id', deletedItemIds);
    }

    // 🚨 [긴급 패치 핵심] 배열 내 객체의 Key 구조를 완벽하게 통일합니다.
    if (items && items.length > 0) {
      const payload = items.map(item => {
        return {
          // 기존 슬라이드는 기존 id 유지, 신규 슬라이드(id 없음)는 서버가 즉시 UUID 생성
          id: item.id ? item.id : crypto.randomUUID(),
          campaign_id: campaignData.id,
          image_url: item.image_url,
          title: item.title,
          subtitle: item.subtitle,
          cta_text: item.cta_text,
          cta_link: item.cta_link,
          sort_order: item.sort_order
        };
      });

      const { error: itemsError } = await supabase.from('bannerit_items').upsert(payload);
      if (itemsError) throw itemsError;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Save Error Details]:', error);
    return res.status(500).json({ error: error.message || 'Database Update Failed' });
  }
}