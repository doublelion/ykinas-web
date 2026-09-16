import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 💡 API 버전: 2025-12-01 고정
const CAFE24_API_VERSION = "2025-12-01";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithFailover(url: string, options: RequestInit, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, options);
      if (response.ok || (response.status !== 429 && response.status < 500 && response.status !== 401)) {
        return response; 
      }
      if (response.status === 401) {
        return response; 
      }
      throw new Error("HTTP Status " + response.status);
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) throw error;
      await delay(Math.pow(2, attempt - 1) * 1000);
    }
  }
  throw new Error("Maximum retries reached");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    if (!payload.mall_id || !payload.subject || !payload.content) {
      throw new Error("필수 파라미터가 누락되었습니다.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tokenData, error: tokenError } = await supabase
      .from("cafe24_auth_tokens")
      .select("*")
      .eq("mall_id", payload.mall_id)
      .single();

    if (tokenError || !tokenData) {
      throw new Error("API 토큰이 존재하지 않습니다.");
    }

    // 💡 client_ip 실제 클라이언트 접속 IP 추출
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    // 💡 422 에러 원인 완벽 제거: 공식 문서대로 requests "배열" 내부에 필수 항목 맵핑
    const requestBody = {
      shop_no: 1,
      requests: [
        {
          title: payload.subject,     // subject -> title 
          content: payload.content,
          writer: payload.writer,     // writer 
          password: payload.password, // 패스워드
          client_ip: clientIp         // IP 처리 완료
        }
      ]
    };

    const boardUrl = "https://" + payload.mall_id + ".cafe24api.com/api/v2/admin/boards/" + payload.board_no + "/articles";
    
    let cafe24Res = await fetchWithFailover(boardUrl, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + tokenData.access_token,
        "Content-Type": "application/json",
        "X-Cafe24-Api-Version": CAFE24_API_VERSION 
      },
      body: JSON.stringify(requestBody)
    });

    if (cafe24Res.status === 401 && tokenData.refresh_token) {
      const clientId = Deno.env.get("CAFE24_CLIENT_ID")!;
      const clientSecret = Deno.env.get("CAFE24_CLIENT_SECRET")!;
      const basicAuth = btoa(clientId + ":" + clientSecret);
      
      const refreshParams = new URLSearchParams();
      refreshParams.append("grant_type", "refresh_token");
      refreshParams.append("refresh_token", tokenData.refresh_token);

      const tokenUrl = "https://" + payload.mall_id + ".cafe24api.com/api/v2/oauth/token";
      const refreshRes = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Authorization": "Basic " + basicAuth,
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Cafe24-Api-Version": CAFE24_API_VERSION
        },
        body: refreshParams.toString()
      });

      if (!refreshRes.ok) throw new Error("토큰 재발급 실패");

      const newTokens = await refreshRes.json();
      
      let newExpiresAtIso = "";
      if (newTokens.expires_at) {
        newExpiresAtIso = new Date(newTokens.expires_at).toISOString();
      } else {
        newExpiresAtIso = new Date(Date.now() + Number(newTokens.expires_in) * 1000).toISOString();
      }

      await supabase.from("cafe24_auth_tokens").update({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_at: newExpiresAtIso,
        updated_at: new Date().toISOString()
      }).eq("mall_id", payload.mall_id);

      cafe24Res = await fetchWithFailover(boardUrl, {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + newTokens.access_token,
          "Content-Type": "application/json",
          "X-Cafe24-Api-Version": CAFE24_API_VERSION 
        },
        body: JSON.stringify(requestBody)
      });
    }

    if (!cafe24Res.ok) {
      const errorText = await cafe24Res.text();
      throw new Error("Cafe24 API Error: " + errorText);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Relay Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});