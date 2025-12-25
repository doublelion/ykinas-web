import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo" onClick={() => setIsOpen(false)}>YKINAS</Link>
        
        {/* 데스크탑 메뉴 */}
        <nav className="nav-desktop">
          <Link to="/portfolio">포트폴리오</Link>
          <Link to="/inquiry">프로젝트 의뢰</Link>
        </nav>

        {/* 햄버거 버튼 */}
        <button className="menu-btn" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* 모바일 사이드바 */}
      <div className={`nav-mobile ${isOpen ? 'open' : ''}`}>
        <Link to="/portfolio" onClick={() => setIsOpen(false)}>포트폴리오</Link>
        <Link to="/inquiry" onClick={() => setIsOpen(false)}>프로젝트 의뢰</Link>
      </div>
    </header>
  );
}

export default Header;