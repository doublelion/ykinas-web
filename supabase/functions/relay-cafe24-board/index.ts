import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",

  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",

  "Access-Control-Allow-Methods":
    "POST, OPTIONS"
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

  throw new Error(
    "Maximum retries reached"
  );
}

serve(async (req: Request) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method Not Allowed"
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json"
        }
      }
    );
  }

  try {

    const payload = await req.json();

    console.log(
      "[RELAY] Incoming payload:",
      JSON.stringify({
        mall_id: payload.mall_id,
        board_no: payload.board_no,
        shop_no: payload.shop_no,
        subject: payload.subject,
        writer: payload.writer,
        has_content: !!payload.content,
        has_password: !!payload.password,
        has_secret: payload.secret === "T",
        has_requests:
          Array.isArray(payload.requests)
      })
    );

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
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      )!
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
      req.headers.get(
        "x-forwarded-for"
      );

    const clientIp =
      clientIpHeader
        ? clientIpHeader
          .split(",")[0]
          .trim()
        : "127.0.0.1";

    /*
     * Cafe24 게시물 등록 API
     *
     * {
     *     "shop_no": 1,
     *     "requests": [
     *         {
     *             "writer": "...",
     *             "title": "...",
     *             "content": "...",
     *             "client_ip": "...",
     *             "password": "...",
     *             "secret": "T"
     *         }
     *     ]
     * }
     */

    let requests;

    /*
     * 기존 아름관광 등에서 사용하는
     * requests 배열 방식은 그대로 유지
     */

    if (
      payload.requests &&
      Array.isArray(payload.requests)
    ) {

      requests =
        payload.requests.map(
          (item: any) => {

            const request: Record<
              string,
              unknown
            > = {
              title:
                item.title ||
                item.subject ||
                "",

              content:
                item.content ||
                "",

              writer:
                item.writer ||
                "",

              password:
                item.password ||
                "",

              client_ip:
                clientIp
            };

            /*
             * 기존 requests 방식에서도
             * secret=T가 전달된 경우에만
             * 비밀글로 등록
             *
             * 아름관광에서 secret을 사용하지 않으면
             * 기존 동작에는 영향 없음.
             */

            if (
              item.secret === "T"
            ) {
              request.secret = "T";
            }

            return request;
          }
        );

    }

    /*
     * QUOTE-IT 단건 요청
     *
     * Cafe24 공식 API 형식:
     *
     * {
     *     "shop_no": 1,
     *     "requests": [
     *         {
     *             "writer": "...",
     *             "title": "...",
     *             "content": "...",
     *             "client_ip": "...",
     *             "password": "...",
     *             "secret": "T"
     *         }
     *     ]
     * }
     */

    else {

      const articleRequest: Record<
        string,
        unknown
      > = {

        title:
          payload.subject ||
          "",

        content:
          payload.content ||
          "",

        writer:
          payload.writer ||
          "고객",

        client_ip:
          clientIp
      };

      /*
       * 게시글 비밀번호가 있을 때만 전달
       */

      if (payload.password) {

        articleRequest.password =
          String(
            payload.password
          );
      }

      /*
       * 비밀글 설정
       *
       * 프론트에서 secret === "T"가
       * 전달된 경우에만 Cafe24로 전달
       */

      if (
        payload.secret === "T"
      ) {

        articleRequest.secret =
          "T";
      }

      requests = [
        articleRequest
      ];
    }

    const requestBody = {

      shop_no:
        payload.shop_no || 1,

      requests:
        requests
    };

    const boardUrl =
      "https://" +
      payload.mall_id +
      ".cafe24api.com/api/v2/admin/boards/" +
      payload.board_no +
      "/articles";

    console.log(
      "[RELAY] Cafe24 URL:",
      boardUrl
    );

    /*
     * 보안상 실제 비밀번호는 로그에 남기지 않음
     */

    const logRequestBody = {

      ...requestBody,

      requests:
        requestBody.requests.map(
          (item: any) => ({

            ...item,

            password:
              item.password
                ? "***"
                : undefined

          })
        )
    };

    console.log(
      "[RELAY] Cafe24 Request Body:",
      JSON.stringify(
        logRequestBody
      )
    );

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
     * Access Token 만료 시 Refresh
     */

    if (
      cafe24Res.status === 401 &&
      tokenData.refresh_token
    ) {

      console.log(
        "[RELAY] Access Token expired. Refreshing..."
      );

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

      if (
        newTokens.expires_at
      ) {

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
            ) * 1000
          ).toISOString();
      }

      const {
        error:
          updateTokenError
      } = await supabase
        .from(
          "cafe24_auth_tokens"
        )
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

    const responseText =
      await cafe24Res.text();

    console.log(
      "[RELAY] Cafe24 Status:",
      cafe24Res.status
    );

    console.log(
      "[RELAY] Cafe24 Response:",
      responseText
    );

    /*
     * Cafe24 오류는 실제 상태코드 그대로 반환
     */

    if (!cafe24Res.ok) {

      return new Response(
        JSON.stringify({

          success: false,

          cafe24_status:
            cafe24Res.status,

          error:
            responseText

        }),
        {
          status:
            cafe24Res.status,

          headers: {

            ...corsHeaders,

            "Content-Type":
              "application/json"

          }
        }
      );
    }

    return new Response(
      JSON.stringify({

        success: true,

        cafe24_status:
          cafe24Res.status,

        response:
          responseText

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
      "[RELAY] Unexpected Error:",
      error
    );

    return new Response(
      JSON.stringify({

        success: false,

        error:
          error?.message ||
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