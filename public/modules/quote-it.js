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
    targetBoardNo: 1002
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

      return String(value || "")
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
          "transition:" +
          "opacity .35s ease," +
          "visibility .35s ease;";
      } else {

        wrapperStyle =
          "position:relative;" +
          "width:100%;" +
          "padding:40px 0;" +
          "display:block;";
      }


      var modalStyle = "";


      if (this.mode === "popup") {

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
          "transform:" +
          "translateY(20px) scale(.98);" +
          "transition:" +
          "transform .45s " +
          "cubic-bezier(.22,1,.36,1);";

      } else {

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


      var html = "";


      // =================================================================
      // CSS
      // =================================================================

      html += "<style>";

      html +=
        "*{" +
        "box-sizing:border-box;" +
        "}";


      html +=
        ":host{" +
        "display:block;" +
        "font-family:" +
        "'Pretendard'," +
        "'Noto Sans KR'," +
        "-apple-system," +
        "BlinkMacSystemFont," +
        "sans-serif;" +
        "}";


      html +=
        ".overlay{" +
        wrapperStyle +
        "}";


      html +=
        ".overlay.active{" +
        "opacity:1;" +
        "visibility:visible;" +
        "pointer-events:auto;" +
        "}";


      html +=
        ".overlay.active .modal{" +
        "transform:translateY(0) scale(1);" +
        "}";


      html +=
        ".modal{" +
        modalStyle +
        "}";


      html +=
        ".close{" +
        "position:absolute;" +
        "top:18px;" +
        "right:20px;" +
        "width:40px;" +
        "height:40px;" +
        "border:0;" +
        "background:transparent;" +
        "font-size:24px;" +
        "font-weight:300;" +
        "color:#222;" +
        "cursor:pointer;" +
        "}";


      html +=
        ".eyebrow{" +
        "margin-bottom:14px;" +
        "font-size:11px;" +
        "font-weight:600;" +
        "letter-spacing:.2em;" +
        "text-transform:uppercase;" +
        "color:#8a9a5b;" +
        "}";


      html +=
        "h2{" +
        "margin:0 0 36px;" +
        "font-family:'Playfair Display',Georgia,serif;" +
        "font-size:clamp(32px,5vw,50px);" +
        "font-weight:400;" +
        "line-height:1.1;" +
        "letter-spacing:-.04em;" +
        "}";


      html +=
        ".form-group{" +
        "margin-bottom:22px;" +
        "}";


      html +=
        "label{" +
        "display:block;" +
        "margin-bottom:8px;" +
        "font-size:12px;" +
        "font-weight:600;" +
        "}";


      html +=
        ".required{" +
        "color:#8a9a5b;" +
        "}";


      html +=
        "input,textarea{" +
        "width:100%;" +
        "padding:13px 0;" +
        "border:0;" +
        "border-bottom:1px solid #d6d2ca;" +
        "outline:0;" +
        "background:transparent;" +
        "color:#222;" +
        "font:inherit;" +
        "font-size:15px;" +
        "border-radius:0;" +
        "}";


      html +=
        "input:focus,textarea:focus{" +
        "border-color:#222;" +
        "}";


      html +=
        "textarea{" +
        "min-height:120px;" +
        "resize:vertical;" +
        "line-height:1.7;" +
        "}";


      html +=
        ".btn-submit{" +
        "width:100%;" +
        "margin-top:18px;" +
        "padding:17px 20px;" +
        "border:0;" +
        "background:#222;" +
        "color:#fff;" +
        "font:inherit;" +
        "font-size:13px;" +
        "font-weight:600;" +
        "letter-spacing:.08em;" +
        "cursor:pointer;" +
        "transition:background .25s ease;" +
        "}";


      html +=
        ".btn-submit:hover{" +
        "background:#8a9a5b;" +
        "}";


      html +=
        ".btn-submit:disabled{" +
        "opacity:.55;" +
        "cursor:not-allowed;" +
        "}";


      html +=
        "@media(max-width:640px){" +
        ".overlay{" +
        "padding:12px;" +
        "}" +
        ".modal{" +
        "padding:44px 24px 30px;" +
        "max-height:calc(100vh - 24px);" +
        "}" +
        "}";


      html += "</style>";

      html +=
        "select{" +
        "width:100%;" +
        "padding:13px 0;" +
        "border:0;" +
        "border-bottom:1px solid #d6d2ca;" +
        "outline:0;" +
        "background:transparent;" +
        "color:#222;" +
        "font:inherit;" +
        "font-size:15px;" +
        "border-radius:0;" +
        "}";


      // =====================================================================
      // HTML
      // =====================================================================

      html +=
        "<div " +
        "class=\"overlay\" " +
        "id=\"overlay\" " +
        "role=\"dialog\" " +
        "aria-modal=\"true\">";


      html +=
        "<div class=\"modal\">";


      // =====================================================================
      // Close Button
      // =====================================================================

      if (this.mode === "popup") {

        html +=
          "<button " +
          "type=\"button\" " +
          "class=\"close\" " +
          "id=\"btnClose\" " +
          "aria-label=\"닫기\">" +
          "×" +
          "</button>";

      }


      // =====================================================================
      // Header
      // =====================================================================

      html +=
        "<div class=\"eyebrow\">" +
        this.escapeHtml(this.uiEyebrow) +
        "</div>";


      html +=
        "<h2>" +
        this.escapeHtml(this.uiTitle) +
        "</h2>";


      // =====================================================================
      // Form
      // =====================================================================

      html +=
        "<form " +
        "id=\"quoteForm\">";


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


        html +=
          "<div class=\"form-group\">";


        // ---------------------------------------------------------------
        // Label
        // ---------------------------------------------------------------

        html +=
          "<label " +
          "for=\"" +
          this.escapeHtml(fieldName) +
          "\">" +

          this.escapeHtml(fieldLabel);


        if (field.required) {

          html +=
            " <span class=\"required\">*</span>";

        }


        html +=
          "</label>";


        // ---------------------------------------------------------------
        // Textarea
        // ---------------------------------------------------------------

        if (fieldType === "textarea") {

          html +=
            "<textarea " +
            "id=\"" +
            this.escapeHtml(fieldName) +
            "\" " +
            "name=\"" +
            this.escapeHtml(fieldName) +
            "\" " +
            "placeholder=\"내용을 입력해주세요.\"" +

            (field.required ? " required" : "") +

            "></textarea>";

        }


        // ---------------------------------------------------------------
        // Select
        // ---------------------------------------------------------------

        else if (fieldType === "select") {

          html +=
            "<select " +
            "id=\"" +
            this.escapeHtml(fieldName) +
            "\" " +
            "name=\"" +
            this.escapeHtml(fieldName) +
            "\"" +

            (field.required ? " required" : "") +

            ">";


          html +=
            "<option value=\"\">" +
            "선택해주세요." +
            "</option>";


          if (
            Array.isArray(field.options)
          ) {

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
                typeof option === "object"
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


              html +=
                "<option " +
                "value=\"" +
                this.escapeHtml(optionValue) +
                "\">" +
                this.escapeHtml(optionLabel) +
                "</option>";

            }

          }


          html +=
            "</select>";

        }


        // ---------------------------------------------------------------
        // Input
        // ---------------------------------------------------------------

        else {

          html +=
            "<input " +
            "type=\"" +
            this.escapeHtml(fieldType) +
            "\" " +

            "id=\"" +
            this.escapeHtml(fieldName) +
            "\" " +

            "name=\"" +
            this.escapeHtml(fieldName) +
            "\" " +

            "placeholder=\"" +
            this.escapeHtml(
              field.placeholder ||
              "입력해주세요."
            ) +
            "\"" +

            (field.required ? " required" : "") +

            ">";

        }


        html +=
          "</div>";

      }


      // =====================================================================
      // Submit
      // =====================================================================

      html +=
        "<button " +
        "type=\"submit\" " +
        "class=\"btn-submit\">" +
        "문의 접수하기" +
        "</button>";


      html +=
        "</form>";

      html +=
        "</div>";

      html +=
        "</div>";


      this.shadowRoot.innerHTML =
        html;
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

  function initQuoteIt() {

    var inlineAnchor =
      document.getElementById(
        "nexus-quote-it-anchor"
      );


    var triggers =
      document.querySelectorAll(
        ".btn-quote-trigger"
      );


    // =====================================================================
    // Inline
    // =====================================================================

    if (
      inlineAnchor &&
      !inlineAnchor.querySelector(
        "quote-it-form"
      )
    ) {

      var inlineForm =
        document.createElement(
          "quote-it-form"
        );


      inlineForm.setAttribute(
        "data-config",
        JSON.stringify({
          displayMode:
            "inline"
        })
      );


      inlineAnchor.appendChild(
        inlineForm
      );
    }


    // =====================================================================
    // Popup
    // =====================================================================

    if (
      triggers.length > 0 &&
      !document.querySelector(
        "quote-it-form[data-config*=\"popup\"]"
      )
    ) {

      var popupForm =
        document.createElement(
          "quote-it-form"
        );


      popupForm.setAttribute(
        "data-config",
        JSON.stringify({
          displayMode:
            "popup"
        })
      );


      document.body.appendChild(
        popupForm
      );
    }


    // =====================================================================
    // Trigger
    // =====================================================================

    triggers.forEach(
      function (button) {

        if (
          button.dataset.quoteItBound ===
          "true"
        ) {

          return;
        }


        button.dataset.quoteItBound =
          "true";


        button.addEventListener(
          "click",
          function (event) {

            event.preventDefault();


            window.dispatchEvent(
              new CustomEvent(
                "QUOTE_IT_TRIGGER_OPEN"
              )
            );
          }
        );
      }
    );
  }


  // =========================================================================
  // DOM Ready
  // =========================================================================

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initQuoteIt
    );

  } else {

    initQuoteIt();
  }

})();