import { createClient } from '@supabase/supabase-js';

// 💡 지침 및 히스토리에 따라 2025-12-01 버전 사용
const CAFE24_API_VERSION = "2025-12-01";

export default async function handler(req, res) {
  // 💡 [보안 방어막] Vercel Cron 시스템이 보낸 요청인지 검증 (reset-demo.js와 동일)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized Access' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 만료일이 3일 이내로 임박한 토큰들만 선별하여 갱신
    const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: tokens, error } = await supabase
      .from("cafe24_auth_tokens")
      .select("*")
      .lt("expires_at", threeDaysLater);

    if (error) throw error;
    if (!tokens || tokens.length === 0) {
      return res.status(200).send("갱신이 필요한 토큰이 없습니다.");
    }

    const clientId = process.env.CAFE24_CLIENT_ID;
    const clientSecret = process.env.CAFE24_CLIENT_SECRET;
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    let successCount = 0;

    for (const token of tokens) {
      try {
        const refreshParams = new URLSearchParams();
        refreshParams.append("grant_type", "refresh_token");
        refreshParams.append("refresh_token", token.refresh_token);

        const tokenUrl = `https://${token.mall_id}.cafe24api.com/api/v2/oauth/token`;
        const fetchRes = await fetch(tokenUrl, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Cafe24-Api-Version": CAFE24_API_VERSION
          },
          body: refreshParams.toString()
        });

        if (fetchRes.ok) {
          const newTokens = await fetchRes.json();
          const newExpiresAtIso = newTokens.expires_at
            ? new Date(newTokens.expires_at).toISOString()
            : new Date(Date.now() + Number(newTokens.expires_in || 7200) * 1000).toISOString();

          await supabase.from("cafe24_auth_tokens").update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token,
            expires_at: newExpiresAtIso,
            updated_at: new Date().toISOString()
          }).eq("mall_id", token.mall_id);

          successCount++;
        } else {
          console.warn(`갱신 실패 [${token.mall_id}]: HTTP ${fetchRes.status}`);
        }
      } catch (innerErr) {
        console.error(`요청 에러 [${token.mall_id}]:`, innerErr);
      }
    }

    return res.status(200).send(`${successCount}개의 몰 토큰 갱신 완료`);
  } catch (err) {
    console.error("Cron Error:", err);
    return res.status(500).send(`스케줄러 실행 실패: ${err.message}`);
  }
}