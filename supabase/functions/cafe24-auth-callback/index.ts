import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);

    const oauthError = url.searchParams.get("error");
    if (oauthError) {
      const oauthDesc = url.searchParams.get("error_description") || oauthError;
      throw new Error("Cafe24 인증 에러 (" + oauthError + "): " + oauthDesc);
    }

    // 💡 [핵심 교정] mall_id가 없으면 state 값에서 쇼핑몰 아이디를 추출합니다.
    let mall_id = url.searchParams.get("mall_id") || url.searchParams.get("state"); 

    // 잘못된 state 값 방어 로직
    if (mall_id === "install") {
      throw new Error("인가 URL의 state 파라미터에 'install' 대신 실제 쇼핑몰 아이디를 넣어주세요.");
    }

    if (!code || !mall_id) {
      throw new Error("Invalid request: 권한 증명 코드(code)나 mall_id 파라미터가 없습니다.");
    }
    const state = url.searchParams.get("state"); // 필요 시에만 사용
    
    // 환경변수 또는 하드코딩된 키 값 세팅
    const clientId = Deno.env.get("CAFE24_CLIENT_ID") || "WNy6KQv4Hd7orrA9ifubBA"; 
    const clientSecret = Deno.env.get("CAFE24_CLIENT_SECRET") || "fVDbpnnKUCDNtle8Uh2YMM";
    
    const supabaseRef = Deno.env.get("SUPABASE_REF") || "ipgzyckubwakijerxcpc";
    const redirectUri = "https://" + supabaseRef + ".supabase.co/functions/v1/cafe24-auth-callback";


    // 💡 [교정 2] tokenUrl과 apiUrl의 중복 선언을 하나로 통합
    const tokenUrl = `https://${mall_id}.cafe24api.com/api/v2/oauth/token`;
    
    const tokenParams = new URLSearchParams();
    tokenParams.append("grant_type", "authorization_code");
    tokenParams.append("code", code);
    tokenParams.append("redirect_uri", redirectUri);

    const basicAuth = btoa(clientId + ":" + clientSecret);

    // apiUrl 변수를 삭제하고, 단일화된 tokenUrl을 fetch에 바로 사용
    const tokenResponse = await fetch(tokenUrl, {
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

    // 💡 [HOTFIX] Cafe24 응답 스펙 예외 처리 (Invalid time value 완벽 방어)
    let expiresAtIso = "";
    if (tokenData.expires_at) {
      // 1순위: 문자열로 반환된 만료 일시 그대로 사용
      expiresAtIso = new Date(tokenData.expires_at).toISOString();
    } else if (tokenData.expires_in) {
      // 2순위: 초(seconds) 단위로 반환될 경우 계산
      expiresAtIso = new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString();
    } else {
      // 3순위: 누락된 경우 기본값 2시간 설정 (Fallback)
      expiresAtIso = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase 환경변수가 누락되었습니다.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase
      .from("cafe24_auth_tokens")
      .upsert({
        mall_id: mall_id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAtIso,
        updated_at: new Date().toISOString()
      }, { onConflict: "mall_id" });

    if (dbError) throw dbError;

    const successHtml = `
  <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif; background:#f9fafb; margin:0; }
        .box { text-align:center; padding: 30px; background:#fff; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.1); border-top: 4px solid #10b981; }
        h2 { color:#111; margin-top:0; font-size: 20px; }
        p { color:#4b5563; font-size: 14px; line-height: 1.5; }
        .mall-id { font-weight: bold; color: #10b981; }
      </style>
    </head>
    <body>
      <div class="box">
        <h2>앱 연동 완료</h2>
        <p><span class="mall-id">[${mall_id}]</span> 상점의 데이터 접근 권한이 승인되었습니다.</p>
        <p style="font-size:12px; color:#9ca3af; margin-top:20px;">보안 정책으로 인해 창이 자동으로 닫히지 않습니다.<br>직접 탭을 닫고 쇼핑몰 관리자로 돌아가주세요.</p>
      </div>
    </body>
  </html>
`;
return new Response(successHtml, { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 });

} catch (error: any) {
console.error("Auth Callback Error:", error);
return new Response("인증 실패: " + error.message, { status: 500 });
}
});