import React from 'react';
import '../style/Footer.scss';

function Footer() {
  const currentYear = new Date().getFullYear(); // 해당연도 가져오기

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="business-info">
          <span className="info-item">
            <strong>상호명</strong> 와이키나스 (YKINAS)
          </span>
          <span className="info-item">
            <strong>대표자</strong> 김용관
          </span>
          <span className="info-item">
            <strong>사업자등록번호</strong> 699-22-02120
          </span>
          <span className="info-item">
            <strong>주소</strong> 인천광역시 부평구 시장로 33, 7층 (부평동, 한남시티프라자)
          </span>
        </div>
        <p className="copyright">
          &copy; {currentYear} <strong>YKINAS</strong>. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
