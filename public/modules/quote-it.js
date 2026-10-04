
/* =========================================================
   QUOTE-IT
   High-End Project Inquiry Popup
   Shadow DOM Encapsulation
========================================================= */

class QuoteItHighEndPopup extends HTMLElement {

  constructor() {
    super();

    this.attachShadow({
      mode: 'open'
    });
  }

  connectedCallback() {
    this.render();
    this.attachEvents();
  }

  render() {

    this.shadowRoot.innerHTML = `
            <style>
                :host {
                    all: initial;
                    font-family:
                        "Pretendard",
                        "Noto Sans KR",
                        -apple-system,
                        BlinkMacSystemFont,
                        sans-serif;
                }

                * {
                    box-sizing: border-box;
                }

                .overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 999999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;

                    background: rgba(15, 15, 15, 0.72);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);

                    opacity: 0;
                    visibility: hidden;
                    pointer-events: none;

                    transition:
                        opacity 0.45s ease,
                        visibility 0.45s ease;
                }

                .overlay.active {
                    opacity: 1;
                    visibility: visible;
                    pointer-events: auto;
                }

                .modal {
                    position: relative;

                    width: min(100%, 680px);
                    max-height: calc(100vh - 48px);
                    overflow-y: auto;

                    padding: 56px;

                    background: #f9f8f6;
                    color: #222;

                    border: 1px solid rgba(255,255,255,0.4);

                    box-shadow:
                        0 30px 100px rgba(0,0,0,0.25);

                    transform: translateY(24px) scale(0.98);
                    opacity: 0;

                    transition:
                        transform 0.55s cubic-bezier(.22,1,.36,1),
                        opacity 0.45s ease;
                }

                .overlay.active .modal {
                    transform: translateY(0) scale(1);
                    opacity: 1;
                }

                .close {
                    position: absolute;
                    top: 24px;
                    right: 24px;

                    width: 40px;
                    height: 40px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border: 0;
                    background: transparent;

                    color: #333;
                    font-size: 24px;
                    font-weight: 300;

                    cursor: pointer;

                    transition:
                        transform 0.25s ease,
                        opacity 0.25s ease;
                }

                .close:hover {
                    transform: rotate(90deg);
                    opacity: 0.55;
                }

                .eyebrow {
                    margin-bottom: 16px;

                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 0.2em;
                    text-transform: uppercase;

                    color: #8a9a5b;
                }

                h2 {
                    margin: 0 0 40px;

                    font-family:
                        "Playfair Display",
                        Georgia,
                        serif;

                    font-size: clamp(32px, 5vw, 52px);
                    font-weight: 400;
                    line-height: 1.1;
                    letter-spacing: -0.04em;
                }

                .form-group {
                    margin-bottom: 24px;
                }

                label {
                    display: block;
                    margin-bottom: 9px;

                    font-size: 12px;
                    font-weight: 600;
                    letter-spacing: 0.04em;
                }

                .required {
                    color: #8a9a5b;
                }

                input,
                textarea {
                    width: 100%;

                    padding: 14px 0;

                    border: 0;
                    border-bottom: 1px solid #d6d2ca;

                    outline: none;

                    background: transparent;

                    color: #222;

                    font: inherit;
                    font-size: 15px;

                    border-radius: 0;

                    transition:
                        border-color 0.25s ease;
                }

                input:focus,
                textarea:focus {
                    border-color: #222;
                }

                textarea {
                    min-height: 120px;
                    resize: vertical;
                    line-height: 1.7;
                }

                input::placeholder,
                textarea::placeholder {
                    color: #aaa;
                }

                .submit {
                    width: 100%;
                    margin-top: 20px;
                    padding: 18px 24px;

                    border: 0;

                    background: #222;
                    color: #fff;

                    font: inherit;
                    font-size: 13px;
                    font-weight: 600;
                    letter-spacing: 0.08em;

                    cursor: pointer;

                    transition:
                        background 0.25s ease,
                        transform 0.25s ease;
                }

                .submit:hover {
                    background: #8a9a5b;
                }

                .submit:active {
                    transform: scale(0.99);
                }

                @media (max-width: 640px) {

                    .overlay {
                        padding: 12px;
                    }

                    .modal {
                        width: 100%;
                        max-height: calc(100vh - 24px);

                        padding: 48px 24px 32px;
                    }

                    h2 {
                        margin-bottom: 32px;
                    }

                    .close {
                        top: 16px;
                        right: 16px;
                    }
                }
            </style>

            <div
                class="overlay"
                id="overlay"
                role="dialog"
                aria-modal="true"
                aria-labelledby="quoteItTitle"
            >

                <div class="modal">

                    <button
                        type="button"
                        class="close"
                        id="btnClose"
                        aria-label="Close"
                    >
                        ×
                    </button>

                    <div class="eyebrow">
                        Project Inquiry
                    </div>

                    <h2 id="quoteItTitle">
                        완벽한 핏을<br>
                        맞춰드립니다.
                    </h2>

                    <form id="quoteForm">

                        <div class="form-group">
                            <label for="company">
                                기업/단체명 <span class="required">*</span>
                            </label>

                            <input
                                type="text"
                                id="company"
                                name="company"
                                placeholder="기업 또는 단체명을 입력해주세요."
                                required
                            >
                        </div>

                        <div class="form-group">
                            <label for="name">
                                담당자 성함 <span class="required">*</span>
                            </label>

                            <input
                                type="text"
                                id="name"
                                name="name"
                                placeholder="담당자 성함을 입력해주세요."
                                required
                            >
                        </div>

                        <div class="form-group">
                            <label for="phone">
                                연락처 <span class="required">*</span>
                            </label>

                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                placeholder="010-0000-0000"
                                autocomplete="tel"
                                required
                            >
                        </div>

                        <div class="form-group">
                            <label for="email">
                                이메일 <span class="required">*</span>
                            </label>

                            <input
                                type="email"
                                id="email"
                                name="email"
                                placeholder="example@email.com"
                                autocomplete="email"
                                required
                            >
                        </div>

                        <div class="form-group">
                            <label for="message">
                                프로젝트 문의 내용
                            </label>

                            <textarea
                                id="message"
                                name="message"
                                placeholder="프로젝트에 대해 자유롭게 작성해주세요."
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            class="submit"
                        >
                            1:1 PROJECT PROPOSAL
                        </button>

                    </form>

                </div>
            </div>
        `;
  }

  attachEvents() {

    const overlay = this.shadowRoot.getElementById('overlay');
    const btnClose = this.shadowRoot.getElementById('btnClose');
    const form = this.shadowRoot.getElementById('quoteForm');

    if (!overlay || !btnClose || !form) {
      return;
    }

    /* -----------------------------------------
       Open
    ----------------------------------------- */

    this.openModal = () => {

      overlay.classList.add('active');

      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';

      setTimeout(() => {
        const firstInput =
          this.shadowRoot.getElementById('company');

        if (firstInput) {
          firstInput.focus();
        }
      }, 300);
    };


    /* -----------------------------------------
       Close
    ----------------------------------------- */

    this.closeModal = () => {

      overlay.classList.remove('active');

      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };


    /* -----------------------------------------
       External Open Event
    ----------------------------------------- */

    this.handleOpenEvent = () => {
      this.openModal();
    };

    window.addEventListener(
      'QUOTE_IT_OPEN_MODAL',
      this.handleOpenEvent
    );


    /* -----------------------------------------
       Close Button
    ----------------------------------------- */

    btnClose.addEventListener(
      'click',
      this.closeModal
    );


    /* -----------------------------------------
       Overlay Click
    ----------------------------------------- */

    overlay.addEventListener(
      'click',
      (event) => {

        if (event.target === overlay) {
          this.closeModal();
        }

      }
    );


    /* -----------------------------------------
       ESC Key
    ----------------------------------------- */

    this.handleKeydown = (event) => {

      if (
        event.key === 'Escape' &&
        overlay.classList.contains('active')
      ) {
        this.closeModal();
      }

    };

    document.addEventListener(
      'keydown',
      this.handleKeydown
    );


    /* -----------------------------------------
       Submit
    ----------------------------------------- */

    form.addEventListener(
      'submit',
      (event) => {

        event.preventDefault();

        const formData =
          new FormData(form);

        const payload =
          Object.fromEntries(formData.entries());

        /*
         * Backend / API Gateway
         *
         * 실제 전송 로직은 이 이벤트를
         * 수신하는 쪽에서 처리합니다.
         */

        window.dispatchEvent(
          new CustomEvent(
            'QUOTE_IT_SUBMIT_REQ',
            {
              detail: payload
            }
          )
        );

        /*
         * MVP 단계에서는 제출 후 닫기.
         * 추후 API 응답에 따라
         * 성공/실패 UI로 확장 가능.
         */

        this.closeModal();
      }
    );
  }

  disconnectedCallback() {

    if (this.handleOpenEvent) {

      window.removeEventListener(
        'QUOTE_IT_OPEN_MODAL',
        this.handleOpenEvent
      );
    }

    if (this.handleKeydown) {

      document.removeEventListener(
        'keydown',
        this.handleKeydown
      );
    }

    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }
}


/* =========================================================
   Custom Element Registration
========================================================= */

if (!customElements.get('quote-it-popup')) {

  customElements.define(
    'quote-it-popup',
    QuoteItHighEndPopup
  );
}


/* =========================================================
   QUOTE-IT Bootstrapper
========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  () => {

    const triggers =
      document.querySelectorAll(
        'a[href="#contact"], .btn--ghost'
      );

    if (!triggers.length) {
      return;
    }

    triggers.forEach(
      (button) => {

        button.addEventListener(
          'click',
          (event) => {

            event.preventDefault();

            let popup =
              document.querySelector(
                'quote-it-popup'
              );

            /*
             * Popup이 아직 없으면
             * 최초 클릭 시 생성
             */

            if (!popup) {

              popup =
                document.createElement(
                  'quote-it-popup'
                );

              document.body.appendChild(
                popup
              );
            }

            /*
             * Custom Element의
             * connectedCallback/render가
             * 완료된 다음 실행
             */

            requestAnimationFrame(
              () => {

                window.dispatchEvent(
                  new Event(
                    'QUOTE_IT_OPEN_MODAL'
                  )
                );

              }
            );
          }
        );
      }
    );
  }
);