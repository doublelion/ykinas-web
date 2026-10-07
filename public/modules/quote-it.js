// ============================================================================
// public/modules/quote-it.js
// QUOTE-IT B2B 통합 모듈
// 팝업 / 인라인 자동 감지
// URL 쿼리 + data-config 동적 설정 지원
// 백틱(Template Literal) 완전 배제
// ============================================================================

(function () {

  "use strict";


  // =========================================================================
  // 중복 로드 방지
  // =========================================================================

  if (customElements.get("quote-it-form")) {
    return;
  }


  // =========================================================================
  // Global Configuration
  // =========================================================================

  var globalConfig = {
    displayMode: "popup",
    mallId: "",
    targetBoardNo: 1002,
    fields: null,
    ui_text: {},
    ui_theme: {},
    tier: "",
    enabled: true
  };


  // =========================================================================
  // 현재 스크립트 탐색
  // =========================================================================

  var currentScript = document.currentScript;


  if (!currentScript) {

    var scripts =
      document.getElementsByTagName("script");

    for (
      var i = 0;
      i < scripts.length;
      i++
    ) {

      if (
        scripts[i].src &&
        scripts[i].src.indexOf(
          "quote-it.js"
        ) !== -1
      ) {

        currentScript =
          scripts[i];

        break;
      }
    }
  }


  // =========================================================================
  // URL Query / data-config 설정 파싱
  // =========================================================================

  if (currentScript) {

    var src =
      currentScript.src || "";


    // ---------------------------------------------------------------------
    // URL Query
    // ---------------------------------------------------------------------

    if (src.indexOf("?") !== -1) {

      var queryString =
        src.split("?")[1];

      var pairs =
        queryString.split("&");


      for (
        var j = 0;
        j < pairs.length;
        j++
      ) {

        var pair =
          pairs[j].split("=");

        var key =
          decodeURIComponent(
            pair[0] || ""
          );

        var value =
          decodeURIComponent(
            pair[1] || ""
          );


        if (key === "mall_id") {

          globalConfig.mallId =
            value;
        }


        if (key === "board_no") {

          var parsedBoardNo =
            parseInt(
              value,
              10
            );

          if (
            !isNaN(parsedBoardNo)
          ) {

            globalConfig.targetBoardNo =
              parsedBoardNo;
          }
        }


        if (key === "mode") {

          globalConfig.displayMode =
            value;
        }
      }
    }


    // ---------------------------------------------------------------------
    // data-config
    // ---------------------------------------------------------------------

    var dataConfig =
      currentScript.getAttribute(
        "data-config"
      );


    if (dataConfig) {

      try {

        var parsedConfig =
          JSON.parse(dataConfig);


        if (
          parsedConfig.mallId
        ) {

          globalConfig.mallId =
            parsedConfig.mallId;
        }


        if (
          parsedConfig.targetBoardNo
        ) {

          globalConfig.targetBoardNo =
            parsedConfig.targetBoardNo;
        }


        if (
          parsedConfig.displayMode
        ) {

          globalConfig.displayMode =
            parsedConfig.displayMode;
        }

      } catch (error) {

        console.warn(
          "[QUOTE-IT] data-config 파싱 실패"
        );
      }
    }
  }


  // =========================================================================
  // Custom Element
  // =========================================================================

  class QuoteItForm extends HTMLElement {

    constructor() {

      super();

      this.attachShadow({
        mode: "open"
      });
    }

    // =====================================================================
    // HTML Escape
    // =====================================================================
    escapeHtml(value) {

      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    }


    // =====================================================================
    // Connected
    // =====================================================================
    connectedCallback() {

      // ---------------------------------------------------------------
      // Component Config
      // ---------------------------------------------------------------
      var componentConfigStr =
        this.getAttribute("data-config");

      var componentConfig = {};

      if (componentConfigStr) {
        try {
          componentConfig =
            JSON.parse(componentConfigStr);
        } catch (error) {
          console.warn(
            "[QUOTE-IT] component data-config 파싱 실패",
            error
          );
        }
      }


      // ---------------------------------------------------------------
      // 기본 설정
      // ---------------------------------------------------------------
      this.mode =
        componentConfig.displayMode ||
        globalConfig.displayMode ||
        "popup";

      this.mallId =
        componentConfig.mallId ||
        globalConfig.mallId ||
        "";

      this.boardNo =
        componentConfig.targetBoardNo ||
        globalConfig.targetBoardNo ||
        1002;


      // ---------------------------------------------------------------
      // UI Text
      // ---------------------------------------------------------------
      this.ui =
        componentConfig.ui_text ||
        globalConfig.ui_text ||
        {};

      this.uiTitle =
        this.ui.title ||
        "완벽한 핏을 맞춰드립니다.";

      this.uiEyebrow =
        this.ui.eyebrow ||
        "Project Inquiry";


      // ---------------------------------------------------------------
      // Dynamic Fields
      // DB / data-config에서 fields가 내려오지 않으면
      // BASIC 요금제 기본 필드 사용
      // ---------------------------------------------------------------
      var defaultFields = [

        {
          name: "company",
          label: "기업/단체명",
          type: "text",
          required: true
        },

        {
          name: "writer",
          label: "담당자 성함",
          type: "text",
          required: true
        },

        {
          name: "phone",
          label: "연락처",
          type: "tel",
          required: true
        },

        {
          name: "content",
          label: "프로젝트 문의 내용",
          type: "textarea",
          required: false
        }

      ];


      this.fields =
        componentConfig.fields ||
        globalConfig.fields ||
        defaultFields;


      // ---------------------------------------------------------------
      // Render / Events
      // ---------------------------------------------------------------
      this.render();
      this.bindEvents();
    }


    // =====================================================================
    // Render
    // =====================================================================

    render() {

      var wrapperStyle = "";
      var modalStyle = "";

      if (this.mode === "popup") {

        wrapperStyle =
          "position:fixed;" +
          "inset:0;" +
          "z-index:99999;" +
          "background:rgba(0,0,0,.72);" +
          "display:flex;" +
          "align-items:center;" +
          "justify-content:center;" +
          "padding:20px;" +
          "opacity:0;" +
          "visibility:hidden;" +
          "pointer-events:none;" +
          "transition:opacity .35s ease,visibility .35s ease;";

        modalStyle =
          "position:relative;" +
          "width:100%;" +
          "max-width:600px;" +
          "max-height:calc(100vh - 40px);" +
          "overflow-y:auto;" +
          "padding:48px;" +
          "background:#f9f8f6;" +
          "color:#222;" +
          "border:1px solid rgba(255,255,255,.4);" +
          "box-shadow:0 30px 100px rgba(0,0,0,.25);" +
          "transform:translateY(20px) scale(.98);" +
          "transition:transform .45s cubic-bezier(.22,1,.36,1);";

      } else {

        wrapperStyle =
          "position:relative;" +
          "width:100%;" +
          "padding:40px 0;" +
          "display:block;";

        modalStyle =
          "position:relative;" +
          "width:100%;" +
          "max-width:680px;" +
          "margin:0 auto;" +
          "padding:48px;" +
          "background:#f9f8f6;" +
          "color:#222;" +
          "border:1px solid #e5e2dc;";

      }


      var html = [];


      // =====================================================================
      // CSS
      // =====================================================================

      html.push(
        "<style>",
        "*{box-sizing:border-box;}",

        ":host{",
        "display:block;",
        "font-family:",
        "'Pretendard',",
        "'Noto Sans KR',",
        "-apple-system,",
        "BlinkMacSystemFont,",
        "'Segoe UI',",
        "sans-serif;",
        "}",

        ".overlay{",
        wrapperStyle,
        "}",

        ".overlay.active{",
        "opacity:1;",
        "visibility:visible;",
        "pointer-events:auto;",
        "}",

        ".overlay.active .modal{",
        "transform:translateY(0) scale(1);",
        "}",

        ".modal{",
        modalStyle,
        "}",

        ".close{",
        "position:absolute;",
        "top:18px;",
        "right:20px;",
        "width:40px;",
        "height:40px;",
        "border:0;",
        "background:transparent;",
        "font-size:24px;",
        "font-weight:300;",
        "line-height:1;",
        "color:#222;",
        "cursor:pointer;",
        "}",

        ".eyebrow{",
        "margin-bottom:14px;",
        "font-size:11px;",
        "font-weight:600;",
        "letter-spacing:.2em;",
        "text-transform:uppercase;",
        "color:#8a9a5b;",
        "}",

        "h2{",
        "margin:0 0 36px;",
        "font-family:'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;",
        "font-size:clamp(32px,5vw,50px);",
        "font-weight:400;",
        "line-height:1.1;",
        "letter-spacing:-.04em;",
        "}",

        ".form-group{",
        "margin-bottom:22px;",
        "}",

        "label{",
        "display:block;",
        "margin-bottom:8px;",
        "font-size:12px;",
        "font-weight:600;",
        "}",

        ".required{",
        "color:#8a9a5b;",
        "}",

        "input,textarea,select{",
        "width:100%;",
        "padding:13px 0;",
        "border:0;",
        "border-bottom:1px solid #d6d2ca;",
        "outline:0;",
        "background:transparent;",
        "color:#222;",
        "font:inherit;",
        "font-size:15px;",
        "border-radius:0;",
        "}",

        "input:focus,textarea:focus,select:focus{",
        "border-bottom-color:#222;",
        "}",

        "textarea{",
        "min-height:120px;",
        "resize:vertical;",
        "line-height:1.7;",
        "}",

        "select{",
        "appearance:none;",
        "-webkit-appearance:none;",
        "cursor:pointer;",
        "}",

        ".btn-submit{",
        "width:100%;",
        "margin-top:18px;",
        "padding:17px 20px;",
        "border:0;",
        "background:#222;",
        "color:#fff;",
        "font:inherit;",
        "font-size:13px;",
        "font-weight:600;",
        "letter-spacing:.08em;",
        "cursor:pointer;",
        "transition:background .25s ease;",
        "}",

        ".btn-submit:hover{",
        "background:#8a9a5b;",
        "}",

        ".btn-submit:disabled{",
        "opacity:.55;",
        "cursor:not-allowed;",
        "}",

        "@media(max-width:640px){",

        ".overlay{",
        "padding:12px;",
        "}",

        ".modal{",
        "padding:44px 24px 30px;",
        "max-height:calc(100vh - 24px);",
        "}",

        "h2{",
        "font-size:clamp(30px,9vw,40px);",
        "margin-bottom:30px;",
        "}",

        "}",

        "</style>"
      );


      // =====================================================================
      // HTML
      // =====================================================================

      html.push(
        "<div ",
        "class=\"overlay\" ",
        "id=\"overlay\" ",
        "role=\"dialog\" ",
        "aria-modal=\"true\">",

        "<div class=\"modal\">"
      );


      // =====================================================================
      // Close Button
      // =====================================================================

      if (this.mode === "popup") {

        html.push(
          "<button ",
          "type=\"button\" ",
          "class=\"close\" ",
          "id=\"btnClose\" ",
          "aria-label=\"닫기\">",
          "×",
          "</button>"
        );

      }


      // =====================================================================
      // Header
      // =====================================================================

      html.push(
        "<div class=\"eyebrow\">",
        this.escapeHtml(this.uiEyebrow),
        "</div>",

        "<h2>",
        this.escapeHtml(this.uiTitle),
        "</h2>",

        "<form id=\"quoteForm\">"
      );


      // =====================================================================
      // Dynamic Fields
      // =====================================================================

      for (var i = 0; i < this.fields.length; i++) {

        var field = this.fields[i];

        if (!field || !field.name) {
          continue;
        }

        var fieldName =
          String(field.name);

        var fieldLabel =
          field.label ||
          fieldName;

        var fieldType =
          field.type ||
          "text";


        html.push(
          "<div class=\"form-group\">",

          "<label ",
          "for=\"",
          this.escapeHtml(fieldName),
          "\">",

          this.escapeHtml(fieldLabel)
        );


        if (field.required) {

          html.push(
            " <span class=\"required\">*</span>"
          );

        }


        html.push(
          "</label>"
        );


        // ---------------------------------------------------------------
        // Textarea
        // ---------------------------------------------------------------

        if (fieldType === "textarea") {

          html.push(
            "<textarea ",
            "id=\"",
            this.escapeHtml(fieldName),
            "\" ",
            "name=\"",
            this.escapeHtml(fieldName),
            "\" ",
            "placeholder=\"내용을 입력해주세요.\"",

            field.required
              ? " required"
              : "",

            "></textarea>"
          );


          // ---------------------------------------------------------------
          // Select
          // ---------------------------------------------------------------

        } else if (fieldType === "select") {

          html.push(
            "<select ",
            "id=\"",
            this.escapeHtml(fieldName),
            "\" ",
            "name=\"",
            this.escapeHtml(fieldName),
            "\"",

            field.required
              ? " required"
              : "",

            ">",

            "<option value=\"\">",
            "선택해주세요.",
            "</option>"
          );


          if (Array.isArray(field.options)) {

            for (
              var j = 0;
              j < field.options.length;
              j++
            ) {

              var option =
                field.options[j];

              var optionValue = "";
              var optionLabel = "";


              if (
                typeof option === "object" &&
                option !== null
              ) {

                optionValue =
                  option.value || "";

                optionLabel =
                  option.label ||
                  option.value ||
                  "";

              } else {

                optionValue =
                  String(option);

                optionLabel =
                  String(option);

              }


              html.push(
                "<option value=\"",
                this.escapeHtml(optionValue),
                "\">",
                this.escapeHtml(optionLabel),
                "</option>"
              );

            }

          }


          html.push(
            "</select>"
          );


          // ---------------------------------------------------------------
          // Input
          // ---------------------------------------------------------------

        } else {

          html.push(
            "<input ",
            "type=\"",
            this.escapeHtml(fieldType),
            "\" ",
            "id=\"",
            this.escapeHtml(fieldName),
            "\" ",
            "name=\"",
            this.escapeHtml(fieldName),
            "\" ",
            "placeholder=\"",
            this.escapeHtml(
              field.placeholder ||
              "입력해주세요."
            ),
            "\"",

            field.required
              ? " required"
              : "",

            ">"
          );

        }


        html.push(
          "</div>"
        );

      }


      // =====================================================================
      // Submit
      // =====================================================================

      html.push(
        "<button ",
        "type=\"submit\" ",
        "class=\"btn-submit\">",
        "문의 접수하기",
        "</button>",

        "</form>",
        "</div>",
        "</div>"
      );


      this.shadowRoot.innerHTML =
        html.join("");

    }


    // =====================================================================
    // Events
    // =====================================================================

    bindEvents() {

      var self = this;

      var overlay =
        this.shadowRoot.getElementById(
          "overlay"
        );

      var btnClose =
        this.shadowRoot.getElementById(
          "btnClose"
        );

      var form =
        this.shadowRoot.getElementById(
          "quoteForm"
        );


      if (!overlay || !form) {
        return;
      }


      // =================================================================
      // Popup Events
      // =================================================================

      if (
        this.mode === "popup"
      ) {

        this.handleOpen =
          function () {

            overlay.classList.add(
              "active"
            );

            document.documentElement.style.overflow =
              "hidden";

            document.body.style.overflow =
              "hidden";
          };


        window.addEventListener(
          "QUOTE_IT_TRIGGER_OPEN",
          this.handleOpen
        );


        this.closeFn =
          function () {

            overlay.classList.remove(
              "active"
            );

            document.documentElement.style.overflow =
              "";

            document.body.style.overflow =
              "";
          };


        if (btnClose) {

          btnClose.addEventListener(
            "click",
            this.closeFn
          );
        }


        overlay.addEventListener(
          "click",
          function (event) {

            if (
              event.target ===
              overlay
            ) {

              self.closeFn();
            }
          }
        );


        this.handleKeydown =
          function (event) {

            if (
              event.key === "Escape" &&
              overlay.classList.contains(
                "active"
              )
            ) {

              self.closeFn();
            }
          };


        document.addEventListener(
          "keydown",
          this.handleKeydown
        );

      } else {

        // 인라인 모드

        overlay.classList.add(
          "active"
        );
      }


      // =================================================================
      // Submit
      // =================================================================

      // =====================================================================
      // Submit
      // =====================================================================

      this.handleSubmit =
        async function (event) {

          event.preventDefault();


          // ---------------------------------------------------------------
          // Mall ID 확인
          // ---------------------------------------------------------------
          if (!self.mallId) {

            alert(
              "상점 정보(mall_id)가 설정되지 않아 접수할 수 없습니다."
            );

            return;
          }


          // ---------------------------------------------------------------
          // Submit Button
          // ---------------------------------------------------------------
          var submitBtn =
            form.querySelector(
              ".btn-submit"
            );

          if (!submitBtn) {
            return;
          }


          submitBtn.disabled =
            true;

          submitBtn.innerText =
            "접수 중...";


          // ---------------------------------------------------------------
          // Form Data
          // ---------------------------------------------------------------
          var formData =
            new FormData(form);


          // ---------------------------------------------------------------
          // 필수값 검증
          // ---------------------------------------------------------------
          for (
            var i = 0;
            i < self.fields.length;
            i++
          ) {

            var field =
              self.fields[i];

            if (
              !field ||
              !field.name ||
              !field.required
            ) {
              continue;
            }


            var value =
              formData.get(field.name);


            if (
              value === null ||
              String(value).trim() === ""
            ) {

              alert(
                field.label +
                "을(를) 입력해주세요."
              );


              submitBtn.disabled =
                false;

              submitBtn.innerText =
                "문의 접수하기";

              return;
            }

          }


          // ---------------------------------------------------------------
          // 기본 정보
          // ---------------------------------------------------------------
          var company =
            formData.get("company") ||
            "";

          var writer =
            formData.get("writer") ||
            "";

          var phone =
            formData.get("phone") ||
            "";


          // ---------------------------------------------------------------
          // Cafe24 Board Content
          // 모든 동적 필드를 게시판 본문으로 직렬화
          // ---------------------------------------------------------------
          var serializedContent =
            "";


          for (
            var k = 0;
            k < self.fields.length;
            k++
          ) {

            var currentField =
              self.fields[k];

            if (
              !currentField ||
              !currentField.name
            ) {
              continue;
            }


            var fieldName =
              currentField.name;

            var fieldLabel =
              currentField.label ||
              fieldName;

            var fieldValue =
              formData.get(fieldName);


            if (
              fieldValue === null ||
              fieldValue === undefined
            ) {

              fieldValue = "";

            }


            serializedContent +=
              "[" +
              fieldLabel +
              "]\n" +
              String(fieldValue) +
              "\n\n";

          }


          // ---------------------------------------------------------------
          // Payload
          // ---------------------------------------------------------------
          var payload = {

            mall_id:
              self.mallId,

            board_no:
              self.boardNo,

            subject:
              "[견적문의] " +
              company +
              " 고객님",

            writer:
              writer,

            password:
              String(phone)
                .replace(
                  /[^0-9]/g,
                  ""
                )
                .slice(-4) +
              "!!",

            content:
              serializedContent

          };


          // ---------------------------------------------------------------
          // fetch 유지
          // ---------------------------------------------------------------
          // =========================================================
          // Supabase Relay
          // =========================================================

          try {

            var res =
              await fetch(
                "https://ipgzyckubwakijerxcpc.supabase.co/functions/v1/relay-cafe24-board",
                {
                  method:
                    "POST",

                  headers: {
                    "Content-Type":
                      "application/json"
                  },

                  body:
                    JSON.stringify(
                      payload
                    )
                }
              );


            if (!res.ok) {

              throw new Error(
                "API 전송 실패"
              );
            }


            alert(
              "성공적으로 접수되었습니다."
            );


            form.reset();


            if (
              self.mode ===
              "popup" &&
              self.closeFn
            ) {

              self.closeFn();
            }


          } catch (error) {

            console.error(
              "[QUOTE-IT]",
              error
            );

            alert(
              "접수 중 오류가 발생했습니다."
            );

          } finally {

            submitBtn.disabled =
              false;

            submitBtn.innerText =
              "문의 접수하기";
          }
        };


      form.addEventListener(
        "submit",
        this.handleSubmit
      );
    }


    // =====================================================================
    // Cleanup
    // =====================================================================

    disconnectedCallback() {

      if (this.handleOpen) {

        window.removeEventListener(
          "QUOTE_IT_TRIGGER_OPEN",
          this.handleOpen
        );
      }


      if (this.handleKeydown) {

        document.removeEventListener(
          "keydown",
          this.handleKeydown
        );
      }


      if (this.handleSubmit) {

        var form =
          this.shadowRoot &&
          this.shadowRoot.getElementById(
            "quoteForm"
          );

        if (form) {

          form.removeEventListener(
            "submit",
            this.handleSubmit
          );
        }
      }


      document.documentElement.style.overflow =
        "";

      document.body.style.overflow =
        "";
    }
  }


  // =========================================================================
  // Custom Element 등록
  // =========================================================================

  customElements.define(
    "quote-it-form",
    QuoteItForm
  );


  // =========================================================================
  // Bootstrapper
  // =========================================================================


  async function loadQuoteItConfig() {

    if (!globalConfig.mallId) {
      console.warn(
        "[QUOTE-IT] mall_id가 없어 서버 설정을 불러올 수 없습니다."
      );
      return;
    }

    try {

      var configUrl =
        "https://ipgzyckubwakijerxcpc.supabase.co/functions/v1/quote-it-config" +
        "?mall_id=" +
        encodeURIComponent(globalConfig.mallId);

      var response =
        await fetch(configUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          },
          cache: "no-store"
        });

      if (!response.ok) {
        throw new Error(
          "Config API HTTP " +
          response.status
        );
      }

      var config =
        await response.json();

      if (!config || typeof config !== "object") {
        throw new Error(
          "Config 데이터가 올바르지 않습니다."
        );
      }

      if (config.enabled === false) {
        console.warn(
          "[QUOTE-IT] 모듈이 비활성화되어 있습니다."
        );

        globalConfig.enabled = false;

        return;
      }

      if (config.tier) {
        globalConfig.tier =
          config.tier;
      }

      if (
        Array.isArray(config.fields)
      ) {
        globalConfig.fields =
          config.fields;
      }

      if (
        config.ui_text &&
        typeof config.ui_text === "object"
      ) {
        globalConfig.ui_text =
          config.ui_text;
      }

      if (
        config.ui_theme &&
        typeof config.ui_theme === "object"
      ) {
        globalConfig.ui_theme =
          config.ui_theme;
      }

      if (config.displayMode) {
        globalConfig.displayMode =
          config.displayMode;
      }

      if (config.targetBoardNo) {
        globalConfig.targetBoardNo =
          config.targetBoardNo;
      }


      if (config.targetSelector) {
        globalConfig.targetSelector = config.targetSelector;
      }

      if (config.injectPosition) {
        globalConfig.injectPosition = config.injectPosition;
      }
      // console.log(
      //   "[QUOTE-IT] Config loaded:",
      //   config
      // );

    } catch (error) {

      console.error(
        "[QUOTE-IT CONFIG]",
        error
      );

      // 서버 설정을 못 가져온 경우
      // 기존 BASIC fallback 유지
    }
  }

  // =========================================================================
  // 프론트엔드: 정밀 타겟팅 및 Zero-Fallback (오류 방지 구조)
  // =========================================================================
  function initQuoteIt() {
    var currentMode = globalConfig.displayMode || "popup";

    // [안전장치] 서버에서 값이 오지 않아도 ReferenceError가 나지 않도록 빈 문자열 할당
    var targetSelector = globalConfig.targetSelector || "";

    function bindTriggers(anchorElem) {
      var triggers = document.querySelectorAll(".btn-quote-trigger");
      for (var i = 0; i < triggers.length; i++) {
        var button = triggers[i];
        if (button.dataset.quoteItBound === "true") continue;
        button.dataset.quoteItBound = "true";

        button.addEventListener("click", function (event) {
          event.preventDefault();
          if (currentMode === "inline" && anchorElem) {
            anchorElem.scrollIntoView({ behavior: "smooth", block: "start" });
          } else {
            window.dispatchEvent(new CustomEvent("QUOTE_IT_TRIGGER_OPEN"));
          }
        });
      }
    }

    if (currentMode === "popup") {
      if (!document.querySelector("quote-it-form[data-config*=\"popup\"]")) {
        var popupForm = document.createElement("quote-it-form");
        popupForm.setAttribute("data-config", JSON.stringify({ displayMode: "popup" }));
        document.body.appendChild(popupForm);
      }
      bindTriggers(null);
      return;
    }

    // 2. initQuoteIt() 내부의 injectInline() 함수 수정 (동적 위치 주입)
    function injectInline(targetElem) {
      if (!targetElem) {
        console.warn("[QUOTE-IT] 타겟이 없어 렌더링을 안전하게 취소합니다.");
        return;
      }

      var inlineAnchor = document.getElementById("nexus-quote-it-anchor");

      if (!inlineAnchor) {
        inlineAnchor = document.createElement("div");
        inlineAnchor.id = "nexus-quote-it-anchor";
        inlineAnchor.style.width = "100%";
        inlineAnchor.style.margin = "40px 0";

        // [수정] 하드코딩된 "afterend" 대신 서버 설정값 사용 (기본값 fallback 제공)
        var position = globalConfig.injectPosition || "afterend";

        // 타겟 요소 기준 지정된 위치(예: beforebegin)에 정확히 안착
        targetElem.insertAdjacentElement(position, inlineAnchor);
      }

      if (!inlineAnchor.querySelector("quote-it-form")) {
        var inlineForm = document.createElement("quote-it-form");
        inlineForm.setAttribute("data-config", JSON.stringify({ displayMode: "inline" }));
        inlineAnchor.appendChild(inlineForm);
      }

      bindTriggers(inlineAnchor);
    }

    // 서버 설정값 자체가 유효하지 않으면 탐색을 시작하지 않음
    if (typeof targetSelector !== "string" || targetSelector.trim() === "") {
      console.warn("[QUOTE-IT] 서버로부터 유효한 타겟 셀렉터가 없습니다.");
      return;
    }

    // 비동기 렌더링 대응 Polling (최대 3초 대기)
    var maxAttempts = 30;
    var attempts = 0;

    var checkExist = setInterval(function () {
      // document.body.querySelector를 통해 문서 본문 내에서만 안전하게 탐색
      var targetElement = document.body ? document.body.querySelector(targetSelector) : null;

      if (targetElement) {
        clearInterval(checkExist);
        console.log("[QUOTE-IT] 정확한 위치 캡처 완료:", targetSelector);
        injectInline(targetElement);
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(checkExist);
          console.warn("[QUOTE-IT] 3초 대기 초과. 타겟(" + targetSelector + ")을 찾지 못했습니다.");
          injectInline(null); // 타겟이 없으므로 injectInline 내부에서 렌더링 거부됨
        }
      }
    }, 100);
  }


  // =========================================================================
  // DOM Ready
  // =========================================================================

  async function bootstrapQuoteIt() {

    await loadQuoteItConfig();

    if (globalConfig.enabled === false) {
      return;
    }

    initQuoteIt();
  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      function () {
        bootstrapQuoteIt();
      }
    );

  } else {

    bootstrapQuoteIt();

  }

})();