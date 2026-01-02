import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Menu, X } from 'lucide-react';

function Header() {
  const [isDark, setIsDark] = useState(true); // 기본 다크모드
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  // --- 채널톡 로직 시작 ---
  useEffect(() => {
    const loadChannelTalk = () => {
      var w = window;
      if (w.ChannelIO) return;
      var ch = function () {
        ch.c(arguments);
      };
      ch.q = [];
      ch.c = function (args) {
        ch.q.push(args);
      };
      w.ChannelIO = ch;
      function l() {
        if (w.ChannelIOInitialized) return;
        w.ChannelIOInitialized = true;
        var s = document.createElement('script');
        s.type = 'text/javascript';
        s.async = true;
        s.src = 'https://cdn.channel.io/dot/ch-plugin-web.js';
        s.charset = 'UTF-8';
        var x = document.getElementsByTagName('script')[0];
        x.parentNode.insertBefore(s, x);
      }
      if (document.readyState === 'complete') l();
      else {
        window.addEventListener('DOMContentLoaded', l, false);
        window.addEventListener('load', l, false);
      }
    };

    loadChannelTalk();

    // 채널톡 실행 (부팅)
    window.ChannelIO('boot', {
      pluginKey: 'e5aabd3f-f5c3-44c3-94bd-fd257edb7f2e', // 여기에 실제 플러그인 키를 넣으세요
      appearance: isDark ? 'dark' : 'light', // 현재 테마 모드에 맞춰 채널톡 색상도 변경됨
    });

    return () => {
      window.ChannelIO('shutdown');
    };
  }, [isDark]); // 테마가 바뀔 때마다 채널톡 색상도 동기화됩니다.
  // --- 채널톡 로직 끝 ---

  useEffect(() => {
    // 테마 변경 시 HTML 속성 업데이트
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
        {/* <Link to="/" className="logo" onClick={() => setIsOpen(false)}><img src='/logo512.png' alt="YKINAS Logo"></img></Link> */}
        {/* 데스크탑 메뉴 */}
        <nav className="nav-desktop">
          <Link to="/portfolio">포트폴리오</Link>
          <Link to="/contact">프로젝트 의뢰</Link>

          <button className="theme-toggle" onClick={() => setIsDark(!isDark)}>
            {/* 아이콘 내부 color 속성 제거하고 CSS로 제어할 수 있게 클래스 부여 */}
            {isDark ? (
              <Sun size={20} className="icon-svg" />
            ) : (
              <Moon size={20} className="icon-svg" />
            )}
          </button>
        </nav>

        {/* 햄버거 버튼 (데스크탑에선 숨김) */}
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

      {/* 딤(Dim) 처리: 메뉴가 열렸을 때만 나타남 */}
      {isOpen && <div className="nav-overlay" onClick={closeMenu}></div>}

      {/* 모바일 사이드바 */}
      <nav className={`nav-mobile ${isOpen ? 'open' : ''}`}>
        {/* 사이드바 내부 상단에 닫기 버튼을 추가하고 싶다면 여기에 넣을 수도 있습니다. */}
        <div className="mobile-menu-header">
          {/* 모바일용 테마 토글 추가 */}
          <button className="theme-toggle" onClick={() => setIsDark(!isDark)}>
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
