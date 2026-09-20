import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 💡 지침 및 히스토리에 따라 2025-12-01 버전 사용
const CAFE24_API_VERSION = "2025-12-01"; 

serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 만료일이 3일 이내로 임박한 토큰들만 선별하여 갱신
    const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: tokens, error } = await supabase
      .from("cafe24_auth_tokens")
      .select("*")
      .lt("expires_at", threeDaysLater);

    if (error) throw error;
    if (!tokens || tokens.length === 0) {
      return new Response("갱신이 필요한 토큰이 없습니다.", { status: 200 });
    }

    const clientId = Deno.env.get("CAFE24_CLIENT_ID")!;
    const clientSecret = Deno.env.get("CAFE24_CLIENT_SECRET")!;
    const basicAuth = btoa(clientId + ":" + clientSecret);

    let successCount = 0;

    // 대상 토큰 일괄 갱신 (다중 테넌트 대응)
    for (const token of tokens) {
      const refreshParams = new URLSearchParams();
      refreshParams.append("grant_type", "refresh_token");
      refreshParams.append("refresh_token", token.refresh_token);

      const tokenUrl = "https://" + token.mall_id + ".cafe24api.com/api/v2/oauth/token";
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Authorization": "Basic " + basicAuth,
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Cafe24-Api-Version": CAFE24_API_VERSION
        },
        body: refreshParams.toString()
      });

      if (res.ok) {
        const newTokens = await res.json();
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
      }
    }

    return new Response(`${successCount}개의 몰 토큰 갱신 완료`, { status: 200 });
  } catch (err: any) {
    console.error("Cron Error:", err);
    return new Response("스케줄러 실행 실패: " + err.message, { status: 500 });
  }
});