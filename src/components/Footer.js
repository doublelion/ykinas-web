import React from 'react';
import '../style/Footer.scss';
import naverTalkIcon from '../assets/images/logo_navertalk_02.png'; // 경로에 맞춰 수정

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* 상단: 비즈니스 정보 */}
        <div className="business-info">
          <span className="info-item"><strong>상호명</strong> 와이키나스 (YKINAS)</span>
          <span className="info-item"><strong>대표자</strong> 김용관</span>
          <span className="info-item"><strong>사업자등록번호</strong> 699-22-02120</span>
          <span className="info-item"><strong>주소</strong> 인천광역시 부평구 시장로 33, 7층</span>
        </div>
        
        {/* 중단: 인증 배지 및 소셜 링크 */}
        <div className="footer-middle">
          <div className="cert-badge">
            <span className="badge-icon">✔</span>
            <span className="badge-text">중소벤처기업부 확인 중소기업</span>
          </div>

          <div className="social-links">
            <a 
              href="https://blog.naver.com/ykinas" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="naver-blog-btn"
            >
              <img src={naverTalkIcon} alt="와이키나스 네이버 블로그" />
              <span>와이키나스 블로그 </span>
            </a>
          </div>
        </div>

        {/* 하단: 카피라이트 */}
        <p className="copyright">
          &copy; {currentYear} <strong>YKIN<span>Λ</span>S</strong>. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;