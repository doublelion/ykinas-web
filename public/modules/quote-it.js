// ============================================================================
// public/modules/quote-it.js
// QUOTE-IT B2B 통합 모듈
// 팝업 / 인라인 자동 감지
// 백틱 미사용
// Lifecycle 버그 방어
// ============================================================================

(function () {
  "use strict";

  if (customElements.get("quote-it-form")) {
    return;
  }


  // ========================================================================
  // Custom Element
  // ========================================================================

  class QuoteItForm extends HTMLElement {

    constructor() {
      super();

      this.attachShadow({
        mode: "open"
      });
    }


    connectedCallback() {

      var configStr =
        this.getAttribute("data-config") || "{}";

      try {
        this.config = JSON.parse(configStr);
      } catch (error) {
        this.config = {};
      }

      this.mode =
        this.config.displayMode || "popup";

      this.mallId =
        this.config.mallId || "ykinas";

      this.boardNo =
        this.config.targetBoardNo || 1002;

      this.render();
      this.bindEvents();
    }


    // ====================================================================
    // Render
    // ====================================================================

    render() {

      var wrapperStyle = "";

      if (this.mode === "popup") {

        wrapperStyle =
          "position:fixed;" +
          "inset:0;" +
          "z-index:99999;" +
          "background:rgba(0,0,0,0.72);" +
          "display:flex;" +
          "align-items:center;" +
          "justify-content:center;" +
          "padding:20px;" +
          "opacity:0;" +
          "visibility:hidden;" +
          "pointer-events:none;" +
          "transition:opacity .35s ease,visibility .35s ease;";
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
          "transform:translateY(20px) scale(.98);" +
          "transition:transform .45s cubic-bezier(.22,1,.36,1);";

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

      html += "*{";
      html += "box-sizing:border-box;";
      html += "}";

      html += ":host{";
      html += "display:block;";
      html += "font-family:";
      html += "'Pretendard','Noto Sans KR',";
      html += "-apple-system,BlinkMacSystemFont,sans-serif;";
      html += "}";

      html += ".overlay{";
      html += wrapperStyle;
      html += "}";

      html += ".overlay.active{";
      html += "opacity:1;";
      html += "visibility:visible;";
      html += "pointer-events:auto;";
      html += "}";

      html += ".overlay.active .modal{";
      html += "transform:translateY(0) scale(1);";
      html += "}";

      html += ".modal{";
      html += modalStyle;
      html += "}";

      html += ".close{";
      html += "position:absolute;";
      html += "top:18px;";
      html += "right:20px;";
      html += "width:40px;";
      html += "height:40px;";
      html += "border:0;";
      html += "background:transparent;";
      html += "font-size:24px;";
      html += "font-weight:300;";
      html += "color:#222;";
      html += "cursor:pointer;";
      html += "}";

      html += ".eyebrow{";
      html += "margin-bottom:14px;";
      html += "font-size:11px;";
      html += "font-weight:600;";
      html += "letter-spacing:.2em;";
      html += "text-transform:uppercase;";
      html += "color:#8a9a5b;";
      html += "}";

      html += "h2{";
      html += "margin:0 0 36px;";
      html += "font-family:'Playfair Display',Georgia,serif;";
      html += "font-size:clamp(32px,5vw,50px);";
      html += "font-weight:400;";
      html += "line-height:1.1;";
      html += "letter-spacing:-.04em;";
      html += "}";

      html += ".form-group{";
      html += "margin-bottom:22px;";
      html += "}";

      html += "label{";
      html += "display:block;";
      html += "margin-bottom:8px;";
      html += "font-size:12px;";
      html += "font-weight:600;";
      html += "}";

      html += ".required{";
      html += "color:#8a9a5b;";
      html += "}";

      html += "input,textarea{";
      html += "width:100%;";
      html += "padding:13px 0;";
      html += "border:0;";
      html += "border-bottom:1px solid #d6d2ca;";
      html += "outline:0;";
      html += "background:transparent;";
      html += "color:#222;";
      html += "font:inherit;";
      html += "font-size:15px;";
      html += "border-radius:0;";
      html += "}";

      html += "input:focus,textarea:focus{";
      html += "border-color:#222;";
      html += "}";

      html += "textarea{";
      html += "min-height:120px;";
      html += "resize:vertical;";
      html += "line-height:1.7;";
      html += "}";

      html += ".btn-submit{";
      html += "width:100%;";
      html += "margin-top:18px;";
      html += "padding:17px 20px;";
      html += "border:0;";
      html += "background:#222;";
      html += "color:#fff;";
      html += "font:inherit;";
      html += "font-size:13px;";
      html += "font-weight:600;";
      html += "letter-spacing:.08em;";
      html += "cursor:pointer;";
      html += "transition:background .25s ease;";
      html += "}";

      html += ".btn-submit:hover{";
      html += "background:#8a9a5b;";
      html += "}";

      html += ".btn-submit:disabled{";
      html += "opacity:.55;";
      html += "cursor:not-allowed;";
      html += "}";

      html += "@media(max-width:640px){";

      html += ".overlay{";
      html += "padding:12px;";
      html += "}";

      html += ".modal{";
      html += "padding:44px 24px 30px;";
      html += "max-height:calc(100vh - 24px);";
      html += "}";

      html += "}";

      html += "</style>";


      // =================================================================
      // HTML
      // =================================================================

      html +=
        "<div " +
        "class=\"overlay\" " +
        "id=\"overlay\" " +
        "role=\"dialog\" " +
        "aria-modal=\"true\">";

      html +=
        "<div class=\"modal\">";


      // 닫기 버튼

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


      // 타이틀

      html +=
        "<div class=\"eyebrow\">" +
        "Project Inquiry" +
        "</div>";

      html +=
        "<h2>" +
        "맞춰드립니다." +
        "</h2>";


      // =================================================================
      // Form
      // =================================================================

      html +=
        "<form " +
        "id=\"quoteForm\" " +
        "novalidate=\"false\">";


      // 기업/단체명

      html +=
        "<div class=\"form-group\">" +

        "<label for=\"company\">" +
        "기업/단체명 " +
        "<span class=\"required\">*</span>" +
        "</label>" +

        "<input " +
        "type=\"text\" " +
        "id=\"company\" " +
        "name=\"company\" " +
        "placeholder=\"기업 또는 단체명을 입력해주세요.\" " +
        "autocomplete=\"organization\" " +
        "required>" +

        "</div>";


      // 담당자

      html +=
        "<div class=\"form-group\">" +

        "<label for=\"writer\">" +
        "담당자 성함 " +
        "<span class=\"required\">*</span>" +
        "</label>" +

        "<input " +
        "type=\"text\" " +
        "id=\"writer\" " +
        "name=\"writer\" " +
        "placeholder=\"담당자 성함을 입력해주세요.\" " +
        "autocomplete=\"name\" " +
        "required>" +

        "</div>";


      // 연락처

      html +=
        "<div class=\"form-group\">" +

        "<label for=\"phone\">" +
        "연락처 " +
        "<span class=\"required\">*</span>" +
        "</label>" +

        "<input " +
        "type=\"tel\" " +
        "id=\"phone\" " +
        "name=\"phone\" " +
        "placeholder=\"010-0000-0000\" " +
        "autocomplete=\"tel\" " +
        "required>" +

        "</div>";


      // 문의 내용

      html +=
        "<div class=\"form-group\">" +

        "<label for=\"content\">" +
        "프로젝트 문의 내용" +
        "</label>" +

        "<textarea " +
        "id=\"content\" " +
        "name=\"content\" " +
        "placeholder=\"프로젝트에 대해 자유롭게 작성해주세요.\">" +
        "</textarea>" +

        "</div>";


      // 제출 버튼

      html +=
        "<button " +
        "type=\"submit\" " +
        "class=\"btn-submit\">" +
        "문의 접수하기" +
        "</button>";


      html += "</form>";
      html += "</div>";
      html += "</div>";


      this.shadowRoot.innerHTML = html;
    }


    // ====================================================================
    // Events
    // ====================================================================

    bindEvents() {

      var self = this;

      var overlay =
        this.shadowRoot.getElementById("overlay");

      var btnClose =
        this.shadowRoot.getElementById("btnClose");

      var form =
        this.shadowRoot.getElementById("quoteForm");


      if (!overlay || !form) {
        return;
      }


      // =================================================================
      // Popup
      // =================================================================

      if (this.mode === "popup") {

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
              overlay.classList.contains("active")
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

      this.handleSubmit =
        async function (event) {

          event.preventDefault();

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


          var formData =
            new FormData(form);


          var company =
            formData.get("company") ||
            "";

          var phone =
            formData.get("phone") ||
            "";

          var writer =
            formData.get("writer") ||
            "";

          var content =
            formData.get("content") ||
            "";


          // 필수값 확인

          if (
            !company.trim() ||
            !writer.trim() ||
            !phone.trim()
          ) {

            alert(
              "필수 항목을 입력해주세요."
            );

            submitBtn.disabled =
              false;

            submitBtn.innerText =
              "문의 접수하기";

            return;
          }


          // =========================================================
          // Cafe24 Board Relay Payload
          // =========================================================

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
              phone
                .replace(
                  /[^0-9]/g,
                  ""
                )
                .slice(-4) +
              "!!",

            content:
              "연락처: " +
              phone +
              "\n\n문의내용:\n" +
              content
          };


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
              "popup"
            ) {

              self.closeFn();
            }


          } catch (error) {

            console.error(
              "QUOTE-IT",
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


    // ====================================================================
    // Lifecycle Cleanup
    // ====================================================================

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


  // ========================================================================
  // Custom Element Registration
  // ========================================================================

  customElements.define(
    "quote-it-form",
    QuoteItForm
  );


  // ========================================================================
  // Bootstrapper
  // ========================================================================

  function initQuoteIt() {

    var inlineAnchor =
      document.getElementById(
        "nexus-quote-it-anchor"
      );

    var triggers =
      document.querySelectorAll(
        ".btn-quote-trigger"
      );


    // ================================================================
    // 1. Inline Mode
    // ================================================================

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
            "inline",

          mallId:
            "ykinas",

          targetBoardNo:
            1002
        })
      );

      inlineAnchor.appendChild(
        inlineForm
      );
    }


    // ================================================================
    // 2. Popup Mode
    // ================================================================

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
            "popup",

          mallId:
            "ykinas",

          targetBoardNo:
            1002
        })
      );

      document.body.appendChild(
        popupForm
      );
    }


    // ================================================================
    // 3. Trigger Binding
    // ================================================================

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


  // ========================================================================
  // DOM Ready
  // defer 로드 시 DOMContentLoaded 유실 방어
  // ========================================================================

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