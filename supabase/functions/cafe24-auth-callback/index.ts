import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const mall_id = url.searchParams.get("state"); 
    
    // Cafe24 개발자 센터에서 발급받은 Client ID / Secret
    const clientId = Deno.env.get("CAFE24_CLIENT_ID") || "앱_클라이언트_아이디_입력"; 
    const clientSecret = Deno.env.get("CAFE24_CLIENT_SECRET") || "앱_시크릿_키_입력";
    
    const supabaseRef = Deno.env.get("SUPABASE_REF") || "ipgzyckubwakijerxcpc";
    const redirectUri = "https://" + supabaseRef + ".supabase.co/functions/v1/cafe24-auth-callback";

    if (!code || !mall_id) {
      throw new Error("Invalid request: Missing code or state(mall_id)");
    }

    const tokenParams = new URLSearchParams();
    tokenParams.append("grant_type", "authorization_code");
    tokenParams.append("code", code);
    tokenParams.append("redirect_uri", redirectUri);

    // 뷰어 깨짐 방지를 위해 안전한 문자열 결합 사용
    const basicAuth = btoa(clientId + ":" + clientSecret);
    const apiUrl = "https://" + mall_id + ".cafe24api.com/api/v2/oauth/token";

    const tokenResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + basicAuth,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Cafe24-Api-Version": "2026-03-01" 
      },
      body: tokenParams.toString()
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error("Token Exchange Failed: " + errorText);
    }

    const tokenData = await tokenResponse.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase environment variables are missing.");
    }

    // Supabase DB에 토큰 안전하게 저장
    const supabase = createClient(supabaseUrl, supabaseKey);

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const { error: dbError } = await supabase
      .from("cafe24_auth_tokens")
      .upsert({
        mall_id: mall_id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }, { onConflict: "mall_id" });

    if (dbError) throw dbError;

    // 쌍따옴표 한 줄로 안전하게 처리
    const successHtml = "[" + mall_id + "] Cafe24 인증이 완료되었습니다. 창을 닫아주세요.";

return new Response(successHtml, { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 });
} catch (error: any) {
console.error("Auth Callback Error:", error);
return new Response("인증 실패: " + error.message, { status: 500 });
}
});