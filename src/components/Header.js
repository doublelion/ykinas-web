import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo" onClick={() => setIsOpen(false)}>YKINAS</Link>
        {/* <Link to="/" className="logo" onClick={() => setIsOpen(false)}><img src='/logo512.png' alt="YKINAS Logo"></img></Link> */}
        {/* 데스크탑 메뉴 */}
        <nav className="nav-desktop">
          <Link to="/portfolio">포트폴리오</Link>
          <Link to="/contact">프로젝트 의뢰</Link>
        </nav>

        {/* 햄버거 버튼 (데스크탑에선 숨김) */}
        <button className="menu-btn" onClick={toggleMenu} aria-label="메뉴 열기">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* 딤(Dim) 처리: 메뉴가 열렸을 때만 나타남 */}
      {isOpen && <div className="nav-overlay" onClick={closeMenu}></div>}

      {/* 모바일 사이드바 */}
      <nav className={`nav-mobile ${isOpen ? 'open' : ''}`}>
        {/* 사이드바 내부 상단에 닫기 버튼을 추가하고 싶다면 여기에 넣을 수도 있습니다. */}
        <div className="mobile-menu-header">
           <button className="close-btn" onClick={closeMenu}><X size={24} /></button>
        </div>
        
        <div className="mobile-links">
          <Link to="/portfolio" onClick={closeMenu}>포트폴리오</Link>
          <Link to="/contact" onClick={closeMenu}>프로젝트 의뢰</Link>
        </div>
      </nav>
    </header>
  );
}

export default Header;