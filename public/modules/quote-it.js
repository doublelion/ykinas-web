(function () {
    "use strict";

    window.ykinas = window.ykinas || {};
    window.ykinas.modules = window.ykinas.modules || {};
    window.ykinas.state = window.ykinas.state || {};
    window.ykinas.util = window.ykinas.util || {};

    var qs = window.ykinas.util.qs || function (selector, root) {
        return (root || document).querySelector(selector);
    };

    var qsa = window.ykinas.util.qsa || function (selector, root) {
        return Array.prototype.slice.call(
            (root || document).querySelectorAll(selector)
        );
    };

    var CONFIG_URL =
        "https://ipgzyckubwakijerxcpc.supabase.co/functions/v1/quote-it-config";

    var RELAY_URL =
        "https://ipgzyckubwakijerxcpc.supabase.co/functions/v1/relay-cafe24-board";

    var QuoteItForm = function () {
        return Reflect.construct(
            HTMLElement,
            [],
            QuoteItForm
        );
    };

    QuoteItForm.prototype =
        Object.create(HTMLElement.prototype);

    QuoteItForm.prototype.constructor =
        QuoteItForm;

    QuoteItForm.prototype.connectedCallback =
        function () {
            var self = this;

            if (self.dataset.initialized === "true") {
                return;
            }

            self.dataset.initialized = "true";

            self.mallId =
                self.getAttribute("mall_id") ||
                self.getAttribute("mall-id") ||
                "ykinas";

            self.boardNo =
                parseInt(
                    self.getAttribute("board_no") ||
                    self.getAttribute("board-no") ||
                    "1002",
                    10
                );

            self.mode =
                self.getAttribute("mode") ||
                "popup";

            self.config = null;
            self.shadow =
                self.attachShadow({
                    mode: "open"
                });

            self.loadConfig();
        };

    QuoteItForm.prototype.loadConfig =
        function () {
            var self = this;

            var url =
                CONFIG_URL +
                "?mall_id=" +
                encodeURIComponent(self.mallId);

            fetch(url, {
                method: "GET",
                cache: "no-store"
            })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error(
                            "QUOTE-IT config load failed: " +
                            response.status
                        );
                    }

                    return response.json();
                })
                .then(function (config) {
                    self.config = config;

                    if (
                        config.target_board_no
                    ) {
                        self.boardNo =
                            parseInt(
                                config.target_board_no,
                                10
                            );
                    }

                    if (
                        config.enabled === false
                    ) {
                        return;
                    }

                    self.render();
                })
                .catch(function (error) {
                    console.error(
                        "[QUOTE-IT]",
                        error
                    );
                });
        };

    QuoteItForm.prototype.render =
        function () {
            var self = this;
            var config = self.config || {};

            var uiText =
                config.ui_text || {};

            var uiTheme =
                config.ui_theme || {};

            var fields =
                Array.isArray(config.fields)
                    ? config.fields
                    : [];

            var title =
                uiText.title ||
                "B2B 맞춤 견적";

            var eyebrow =
                uiText.eyebrow ||
                "기업 전용";

            var buttonText =
                uiText.button ||
                "견적 문의하기";

            var html = "";

            html +=
                "<style>" +
                ":host{display:block;box-sizing:border-box;}" +
                "*{box-sizing:border-box;}" +
                ".quote-it{font-family:Arial,sans-serif;}" +
                ".quote-it-title{font-size:24px;font-weight:600;margin:0 0 8px;}" +
                ".quote-it-eyebrow{font-size:12px;letter-spacing:.08em;margin-bottom:8px;}" +
                ".quote-it-field{margin-top:16px;}" +
                ".quote-it-label{display:block;font-size:13px;margin-bottom:7px;}" +
                ".quote-it-input,.quote-it-textarea,.quote-it-select{" +
                "width:100%;" +
                "border:1px solid #ddd;" +
                "background:#fff;" +
                "padding:13px 14px;" +
                "font-size:14px;" +
                "outline:none;" +
                "}" +
                ".quote-it-textarea{min-height:150px;resize:vertical;}" +
                ".quote-it-submit{" +
                "margin-top:22px;" +
                "width:100%;" +
                "border:0;" +
                "background:" +
                (uiTheme.primary || "#ff5500") +
                ";" +
                "color:#fff;" +
                "padding:15px;" +
                "cursor:pointer;" +
                "}" +
                ".quote-it-message{margin-top:12px;font-size:13px;}" +
                ".quote-it-captcha{display:none;}" +
                "</style>";

            html +=
                '<div class="quote-it">';

            html +=
                '<div class="quote-it-eyebrow">' +
                this.escapeHtml(eyebrow) +
                "</div>";

            html +=
                '<h2 class="quote-it-title">' +
                this.escapeHtml(title) +
                "</h2>";

            html +=
                '<form class="quote-it-form">';

            fields.forEach(function (field) {
                html +=
                    self.renderField(field);
            });

            html +=
                '<div class="quote-it-field quote-it-captcha">' +
                '<input type="text" name="captcha" autocomplete="off">' +
                "</div>";

            html +=
                '<button type="submit" class="quote-it-submit">' +
                self.escapeHtml(buttonText) +
                "</button>";

            html +=
                '<div class="quote-it-message"></div>';

            html +=
                "</form></div>";

            self.shadow.innerHTML =
                html;

            var form =
                qs(
                    ".quote-it-form",
                    self.shadow
                );

            if (form) {
                form.addEventListener(
                    "submit",
                    function (event) {
                        event.preventDefault();

                        self.submitForm(form);
                    }
                );
            }
        };

    QuoteItForm.prototype.renderField =
        function (field) {
            var name =
                field.name || "";

            var type =
                field.type || "text";

            var label =
                field.label || name;

            var required =
                field.required
                    ? " required"
                    : "";

            var html =
                '<div class="quote-it-field">';

            html +=
                '<label class="quote-it-label" for="quote-it-' +
                this.escapeAttribute(name) +
                '">' +
                this.escapeHtml(label) +
                "</label>";

            if (type === "textarea") {
                html +=
                    '<textarea class="quote-it-textarea" id="quote-it-' +
                    this.escapeAttribute(name) +
                    '" name="' +
                    this.escapeAttribute(name) +
                    '"' +
                    required +
                    "></textarea>";
            } else if (
                type === "select"
            ) {
                html +=
                    '<select class="quote-it-select" id="quote-it-' +
                    this.escapeAttribute(name) +
                    '" name="' +
                    this.escapeAttribute(name) +
                    '"' +
                    required +
                    ">";

                html +=
                    '<option value="">선택해 주세요</option>';

                var options =
                    Array.isArray(field.options)
                        ? field.options
                        : [];

                options.forEach(function (
                    option
                ) {
                    html +=
                        '<option value="' +
                        this.escapeAttribute(
                            option
                        ) +
                        '">' +
                        this.escapeHtml(
                            option
                        ) +
                        "</option>";
                }, this);

                html +=
                    "</select>";
            } else {
                html +=
                    '<input class="quote-it-input" id="quote-it-' +
                    this.escapeAttribute(name) +
                    '" type="' +
                    this.escapeAttribute(type) +
                    '" name="' +
                    this.escapeAttribute(name) +
                    '"' +
                    required +
                    ">";
            }

            html +=
                "</div>";

            return html;
        };

    QuoteItForm.prototype.submitForm =
        function (form) {
            var self = this;

            var formData =
                new FormData(form);

            var serializedContent =
                "";

            var company = "";
            var writer = "";
            var phone = "";

            var fields =
                self.config &&
                Array.isArray(
                    self.config.fields
                )
                    ? self.config.fields
                    : [];

            fields.forEach(function (
                field
            ) {
                var name =
                    field.name || "";

                var value =
                    String(
                        formData.get(name) || ""
                    ).trim();

                if (name === "company") {
                    company = value;
                }

                if (name === "writer") {
                    writer = value;
                }

                if (name === "phone") {
                    phone = value;
                }

                serializedContent +=
                    "[" +
                    (field.label || name) +
                    "]\n" +
                    value +
                    "\n\n";
            });

            /*
             * 기존 비밀번호 로직
             *
             * 010-9063-3069
             * ->
             * Qt3069!!*
             */
            var phoneDigits =
                String(phone)
                    .replace(
                        /[^0-9]/g,
                        ""
                    )
                    .slice(-4);

            var safePassword =
                "Qt" +
                phoneDigits +
                "!!*";

            /*
             * QUOTE-IT 비밀글
             *
             * Cafe24 API:
             * secret = T
             */
            var secret =
                "T";

            var payload = {
                mall_id: self.mallId,
                board_no: parseInt(
                    self.boardNo,
                    10
                ),
                subject:
                    "[견적문의] " +
                    company +
                    " 고객님",
                writer:
                    writer || "고객",
                password:
                    safePassword,
                secret:
                    secret,
                content:
                    serializedContent
            };

            var submitButton =
                qs(
                    ".quote-it-submit",
                    self.shadow
                );

            var message =
                qs(
                    ".quote-it-message",
                    self.shadow
                );

            if (submitButton) {
                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "전송 중...";
            }

            if (message) {
                message.textContent = "";
            }

            fetch(RELAY_URL, {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify(
                    payload
                )
            })
                .then(function (response) {
                    return response
                        .json()
                        .then(function (data) {
                            return {
                                ok:
                                    response.ok,
                                status:
                                    response.status,
                                data:
                                    data
                            };
                        });
                })
                .then(function (result) {
                    if (!result.ok) {
                        throw new Error(
                            "Cafe24 등록 실패 (" +
                            result.status +
                            "): " +
                            JSON.stringify(
                                result.data
                            )
                        );
                    }

                    if (message) {
                        message.textContent =
                            "견적 문의가 정상적으로 접수되었습니다.";
                    }

                    form.reset();
                })
                .catch(function (error) {
                    console.error(
                        "[QUOTE-IT]",
                        error
                    );

                    if (message) {
                        message.textContent =
                            "문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
                    }
                })
                .finally(function () {
                    if (submitButton) {
                        submitButton.disabled =
                            false;

                        submitButton.textContent =
                            (
                                self.config &&
                                self.config.ui_text &&
                                self.config.ui_text.button
                            ) ||
                            "견적 문의하기";
                    }
                });
        };

    QuoteItForm.prototype.escapeHtml =
        function (value) {
            return String(value)
                .replace(
                    /&/g,
                    "&amp;"
                )
                .replace(
                    /</g,
                    "&lt;"
                )
                .replace(
                    />/g,
                    "&gt;"
                )
                .replace(
                    /"/g,
                    "&quot;"
                )
                .replace(
                    /'/g,
                    "&#039;"
                );
        };

    QuoteItForm.prototype.escapeAttribute =
        function (value) {
            return this.escapeHtml(value);
        };

    if (
        !customElements.get(
            "quote-it-form"
        )
    ) {
        customElements.define(
            "quote-it-form",
            QuoteItForm
        );
    }
})();