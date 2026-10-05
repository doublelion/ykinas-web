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
    // Connected
    // =====================================================================

    connectedCallback() {

      var componentConfigStr =
        this.getAttribute(
          "data-config"
        );

      var componentConfig = {};


      if (componentConfigStr) {

        try {

          componentConfig =
            JSON.parse(
              componentConfigStr
            );

        } catch (error) {

          componentConfig = {};
        }
      }


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


      if (!this.mallId) {

        console.warn(
          "[QUOTE-IT] mall_id 설정이 누락되었습니다."
        );
      }


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


      // 헤더

      html +=
        "<div class=\"eyebrow\">" +
        "Project Inquiry" +
        "</div>";


      html +=
        "<h2>" +
        "완벽한 핏을<br>맞춰드립니다." +
        "</h2>";


      // =================================================================
      // Form
      // =================================================================

      html +=
        "<form " +
        "id=\"quoteForm\">";


      // 기업 / 단체명

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


      // 제출

      html +=
        "<button " +
        "type=\"submit\" " +
        "class=\"btn-submit\">" +
        "문의 접수하기" +
        "</button>";


      html += "</form>";
      html += "</div>";
      html += "</div>";


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

      this.handleSubmit =
        async function (event) {

          event.preventDefault();


          if (!self.mallId) {

            alert(
              "상점 정보(mall_id)가 설정되지 않아 접수할 수 없습니다."
            );

            return;
          }


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
            formData.get(
              "company"
            ) || "";


          var phone =
            formData.get(
              "phone"
            ) || "";


          var writer =
            formData.get(
              "writer"
            ) || "";


          var content =
            formData.get(
              "content"
            ) || "";


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
          // Payload
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