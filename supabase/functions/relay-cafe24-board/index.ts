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

            /*
             * 정상 응답 또는
             * 4xx 오류는 그대로 반환
             *
             * 429 / 5xx / 401만 재시도
             */
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

    /*
     * ============================================================
     * CORS
     * ============================================================
     */

    if (req.method === "OPTIONS") {
        return new Response("ok", {
            status: 200,
            headers: corsHeaders
        });
    }

    /*
     * ============================================================
     * POST ONLY
     * ============================================================
     */

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
                    "Content-Type": "application/json"
                }
            }
        );
    }

    try {

        /*
         * ========================================================
         * Payload
         * ========================================================
         */

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
                has_requests:
                    Array.isArray(payload.requests)
            })
        );

        /*
         * ========================================================
         * 필수값
         * ========================================================
         */

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

        /*
         * ========================================================
         * Supabase
         * ========================================================
         */

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        /*
         * ========================================================
         * Cafe24 Token
         * ========================================================
         */

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

        /*
         * ========================================================
         * Client IP
         * ========================================================
         */

        const clientIpHeader =
            req.headers.get("x-forwarded-for");

        const clientIp =
            clientIpHeader
                ? clientIpHeader
                    .split(",")[0]
                    .trim()
                : "127.0.0.1";

        /*
         * ========================================================
         * Cafe24 Request Body
         * ========================================================
         */

        let requestBody;

        /*
         * --------------------------------------------------------
         * 아름관광 레거시
         * --------------------------------------------------------
         *
         * 기존 requests 배열 방식은 그대로 유지
         */

        if (
            payload.requests &&
            Array.isArray(payload.requests)
        ) {

            requestBody = {
                shop_no:
                    payload.shop_no || 1,

                requests:
                    payload.requests.map(
                        (item: any) => ({
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
                        })
                    )
            };

        } else {

            /*
             * ----------------------------------------------------
             * QUOTE-IT
             * ----------------------------------------------------
             *
             * 우선 Cafe24 게시물 등록 최소 필드만 전송
             *
             * password / secret 제거
             * ----------------------------------------------------
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

        /*
         * ========================================================
         * Board URL
         * ========================================================
         */

        const boardUrl =
            "https://" +
            payload.mall_id +
            ".cafe24api.com/api/v2/admin/boards/" +
            payload.board_no +
            "/articles";

        /*
         * ========================================================
         * Debug
         * ========================================================
         */

        console.log(
            "[RELAY] Cafe24 URL:",
            boardUrl
        );

        console.log(
            "[RELAY] Cafe24 Request Body:",
            JSON.stringify(requestBody)
        );

        /*
         * ========================================================
         * Cafe24 POST
         * ========================================================
         */

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
         * ========================================================
         * Access Token 만료
         * ========================================================
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
             * ----------------------------------------------------
             * 새 Access Token으로 재전송
             * ----------------------------------------------------
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
         * ========================================================
         * Cafe24 Response
         * ========================================================
         */

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
         * ========================================================
         * Cafe24 Error
         * ========================================================
         *
         * 기존처럼 무조건 500으로 바꾸지 않는다.
         *
         * 422면 422 그대로 프론트로 전달.
         * ========================================================
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

        /*
         * ========================================================
         * Success
         * ========================================================
         */

        return new Response(
            JSON.stringify({
                success: true,
                cafe24_status:
                    cafe24Res.status
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