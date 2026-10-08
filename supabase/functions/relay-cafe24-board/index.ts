import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type"
};

const CAFE24_API_VERSION = "2025-12-01";

const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithFailover(
  url: string,
  options: RequestInit,
  maxRetries = 3
) {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, options);

      if (
        response.ok ||
        (
          response.status !== 429 &&
          response.status < 500 &&
          response.status !== 401
        )
      ) {
        return response;
      }

      if (response.status === 401) {
        return response;
      }

      throw new Error(
        "HTTP Status " + response.status
      );

    } catch (error) {
      attempt++;

      if (attempt >= maxRetries) {
        throw error;
      }

      await delay(
        Math.pow(2, attempt - 1) * 1000
      );
    }
  }

  throw new Error("Maximum retries reached");
}

serve(async (req: Request) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  try {

    const payload = await req.json();

    if (!payload.mall_id) {
      throw new Error(
        "필수 파라미터(mall_id)가 누락되었습니다."
      );
    }

    if (!payload.board_no) {
      throw new Error(
        "필수 파라미터(board_no)가 누락되었습니다."
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      data: tokenData,
      error: tokenError
    } = await supabase
      .from("cafe24_auth_tokens")
      .select("*")
      .eq("mall_id", payload.mall_id)
      .single();

    if (tokenError || !tokenData) {
      throw new Error(
        "API 토큰이 존재하지 않습니다."
      );
    }

    const clientIpHeader =
      req.headers.get("x-forwarded-for");

    const clientIp =
      clientIpHeader
        ? clientIpHeader.split(",")[0].trim()
        : "127.0.0.1";

    let requestBody;

    /*
     * ------------------------------------------------------------
     * 아름관광 레거시
     * requests 배열 구조 유지
     * ------------------------------------------------------------
     */

    if (
      payload.requests &&
      Array.isArray(payload.requests)
    ) {

      requestBody = {
        shop_no: payload.shop_no || 1,

        requests: payload.requests.map(
          (item: any) => ({
            title:
              item.title ||
              item.subject ||
              "",

            content:
              item.content || "",

            writer:
              item.writer || "",

            password:
              item.password || "",

            client_ip:
              clientIp
          })
        )
      };

    } else {

      /*
       * --------------------------------------------------------
       * QUOTE-IT
       * 단일 request 구조
       * --------------------------------------------------------
       */

      requestBody = {
        request: {
          shop_no:
            payload.shop_no || 1,
          title:
            payload.subject || "",
          content:
            payload.content || "",
          writer:
            payload.writer || "",
          client_ip:
            clientIp
        }
      };
    }

    const boardUrl =
      "https://" +
      payload.mall_id +
      ".cafe24api.com/api/v2/admin/boards/" +
      payload.board_no +
      "/articles";

    let cafe24Res =
      await fetchWithFailover(
        boardUrl,
        {
          method: "POST",

          headers: {
            "Authorization":
              "Bearer " +
              tokenData.access_token,

            "Content-Type":
              "application/json",

            "X-Cafe24-Api-Version":
              CAFE24_API_VERSION
          },

          body:
            JSON.stringify(
              requestBody
            )
        }
      );


    /*
     * ------------------------------------------------------------
     * Access Token 만료
     * Refresh Token으로 재발급
     * ------------------------------------------------------------
     */

    if (
      cafe24Res.status === 401 &&
      tokenData.refresh_token
    ) {

      const clientId =
        Deno.env.get(
          "CAFE24_CLIENT_ID"
        )!;

      const clientSecret =
        Deno.env.get(
          "CAFE24_CLIENT_SECRET"
        )!;

      const basicAuth =
        btoa(
          clientId +
          ":" +
          clientSecret
        );

      const refreshParams =
        new URLSearchParams();

      refreshParams.append(
        "grant_type",
        "refresh_token"
      );

      refreshParams.append(
        "refresh_token",
        tokenData.refresh_token
      );

      const tokenUrl =
        "https://" +
        payload.mall_id +
        ".cafe24api.com/api/v2/oauth/token";

      const refreshRes =
        await fetch(
          tokenUrl,
          {
            method: "POST",

            headers: {
              "Authorization":
                "Basic " +
                basicAuth,

              "Content-Type":
                "application/x-www-form-urlencoded",

              "X-Cafe24-Api-Version":
                CAFE24_API_VERSION
            },

            body:
              refreshParams.toString()
          }
        );

      if (!refreshRes.ok) {

        const refreshError =
          await refreshRes.text();

        throw new Error(
          "토큰 재발급 실패: " +
          refreshError
        );
      }

      const newTokens =
        await refreshRes.json();

      let newExpiresAtIso = "";

      if (newTokens.expires_at) {

        newExpiresAtIso =
          new Date(
            newTokens.expires_at
          ).toISOString();

      } else {

        newExpiresAtIso =
          new Date(
            Date.now() +
            Number(
              newTokens.expires_in
            ) *
            1000
          ).toISOString();
      }

      const {
        error: updateTokenError
      } = await supabase
        .from("cafe24_auth_tokens")
        .update({
          access_token:
            newTokens.access_token,

          refresh_token:
            newTokens.refresh_token ||
            tokenData.refresh_token,

          expires_at:
            newExpiresAtIso,

          updated_at:
            new Date().toISOString()
        })
        .eq(
          "mall_id",
          payload.mall_id
        );

      if (updateTokenError) {
        throw new Error(
          "새 토큰 저장 실패: " +
          updateTokenError.message
        );
      }

      /*
       * 갱신된 Access Token으로
       * Cafe24 게시글 재전송
       */

      cafe24Res =
        await fetchWithFailover(
          boardUrl,
          {
            method: "POST",

            headers: {
              "Authorization":
                "Bearer " +
                newTokens.access_token,

              "Content-Type":
                "application/json",

              "X-Cafe24-Api-Version":
                CAFE24_API_VERSION
            },

            body:
              JSON.stringify(
                requestBody
              )
          }
        );
    }

    /*
     * ------------------------------------------------------------
     * Cafe24 최종 응답 검사
     * ------------------------------------------------------------
     */

    if (!cafe24Res.ok) {

      const errorText =
        await cafe24Res.text();

      throw new Error(
        "Cafe24 API Error: " +
        errorText
      );
    }

    return new Response(
      JSON.stringify({
        success: true
      }),
      {
        status: 200,

        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json"
        }
      }
    );

  } catch (error: any) {

    console.error(
      "Relay Error:",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error.message ||
          "알 수 없는 오류"
      }),
      {
        status: 500,

        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json"
        }
      }
    );
  }
});