import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Menu, X } from 'lucide-react';

function Header() {
  const [isDark, setIsDark] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isBooted, setIsBooted] = useState(false); // 부팅 상태를 state로 관리

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  // 1. 채널톡 지연 부팅 및 테마 업데이트
  useEffect(() => {
    const handleShowChannel = () => {
      if (window.ChannelIO && !isBooted) {
        window.ChannelIO('boot', {
          pluginKey: 'e5aabd3f-f5c3-44c3-94bd-fd257edb7f2e',
          appearance: isDark ? 'dark' : 'light',
        });
        setIsBooted(true);
      }
    };

    if (!isBooted) {
      window.addEventListener('scroll', handleShowChannel, { passive: true });
      window.addEventListener('touchstart', handleShowChannel, {
        passive: true,
      });
      window.addEventListener('mousemove', handleShowChannel, {
        passive: true,
      });
    } else {
      // 이미 부팅된 상태에서 테마만 변경될 때
      window.ChannelIO('update', {
        appearance: isDark ? 'dark' : 'light',
      });
    }

    return () => {
      window.removeEventListener('scroll', handleShowChannel);
      window.removeEventListener('touchstart', handleShowChannel);
      window.removeEventListener('mousemove', handleShowChannel);
    };
  }, [isDark, isBooted]); // isBooted를 의존성 배열에 추가

  // 2. 시스템 테마 적용
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      isDark ? 'dark' : 'light',
    );
  }, [isDark]);

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo" onClick={() => setIsOpen(false)}>
          YKIN<span>Λ</span>S
        </Link>

        {/* 데스크탑 메뉴 */}
        <nav className="nav-desktop">
          <Link to="/audit" className="nav-audit-btn">
            무료 웹 진단
          </Link>

          {/* 🚀 데스크탑 템플릿 메뉴 추가 */}
          <Link to="/templates">템플릿</Link>

          <Link to="/portfolio">포트폴리오</Link>
          <Link to="/contact">프로젝트 의뢰</Link>
          <button className="theme-toggle" aria-label="화면 테마 변경" onClick={() => setIsDark(!isDark)}>
            {isDark ? (
              <Sun size={20} className="icon-svg" />
            ) : (
              <Moon size={20} className="icon-svg" />
            )}
          </button>
        </nav>

        {/* 햄버거 버튼 */}
        <button
          className="menu-btn"
          onClick={toggleMenu}
          aria-label="메뉴 열기"
        >
          {isOpen ? (
            <X size={24} className="icon-svg" />
          ) : (
            <Menu size={24} className="icon-svg" />
          )}
        </button>
      </div>

      {/* 딤(Dim) 처리 */}
      {isOpen && <div className="nav-overlay" onClick={closeMenu}></div>}

      {/* 모바일 사이드바 */}
      <nav className={`nav-mobile ${isOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <button className="theme-toggle" aria-label="화면 테마 변경" onClick={() => setIsDark(!isDark)}>
            {isDark ? (
              <Sun size={20} className="icon-svg" />
            ) : (
              <Moon size={20} className="icon-svg" />
            )}
          </button>
          <button className="close-btn" onClick={closeMenu}>
            <X size={24} />
          </button>
        </div>

        <div className="mobile-links">
          <Link to="/audit" className="nav-audit-btn" onClick={closeMenu}>
            무료 웹 진단
          </Link>

          {/* 🚀 모바일 템플릿 메뉴 추가 */}
          <Link to="/templates" onClick={closeMenu}>
            템플릿
          </Link>

          <Link to="/portfolio" onClick={closeMenu}>
            포트폴리오
          </Link>
          <Link to="/contact" onClick={closeMenu}>
            프로젝트 의뢰
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default Header;
