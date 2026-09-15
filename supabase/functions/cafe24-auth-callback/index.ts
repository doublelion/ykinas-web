import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);

    // 💡 핫픽스: Cafe24가 인증을 거부하고 리다이렉트 했을 때의 에러 선제적 방어
    const oauthError = url.searchParams.get("error");
    if (oauthError) {
      const oauthDesc = url.searchParams.get("error_description") || oauthError;
      throw new Error("Cafe24 인증 에러 (" + oauthError + "): " + oauthDesc);
    }

    const code = url.searchParams.get("code");
    const mall_id = url.searchParams.get("state"); 
    
    // Cafe24 개발자 센터에서 발급받은 Client ID / Secret
    const clientId = Deno.env.get("CAFE24_CLIENT_ID") || "WNy6KQv4Hd7orrA9ifubBA"; 
    const clientSecret = Deno.env.get("CAFE24_CLIENT_SECRET") || "fVDbpnnKUCDNtle8Uh2YMM";
    
    const supabaseRef = Deno.env.get("SUPABASE_REF") || "ipgzyckubwakijerxcpc";
    const redirectUri = "https://" + supabaseRef + ".supabase.co/functions/v1/cafe24-auth-callback";

    if (!code || !mall_id) {
      throw new Error("Invalid request: 권한 증명 코드(code)가 존재하지 않습니다.");
    }

    const tokenParams = new URLSearchParams();
    tokenParams.append("grant_type", "authorization_code");
    tokenParams.append("code", code);
    tokenParams.append("redirect_uri", redirectUri);

    const basicAuth = btoa(clientId + ":" + clientSecret);
    const apiUrl = "https://" + mall_id + ".cafe24api.com/api/v2/oauth/token";

    const tokenResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + basicAuth,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Cafe24-Api-Version": "2025-12-01" 
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
      throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
    }

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

    const successHtml = "[" + mall_id + "] Cafe24 인증이 완료되었습니다. 창을 닫아주세요.";return new Response(successHtml, { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 });

} catch (error: any) {
console.error("Auth Callback Error:", error);
return new Response("인증 실패: " + error.message, { status: 500 });
}
});