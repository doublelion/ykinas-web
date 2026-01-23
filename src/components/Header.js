import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Menu, X } from 'lucide-react';

function Header() {
  const [isDark, setIsDark] = useState(true); // 기본 다크모드
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);
  useEffect(() => {
    // 이미 index.html에서 로드되었으므로 바로 boot 호출
    if (window.ChannelIO) {
      window.ChannelIO('boot', {
        pluginKey: 'e5aabd3f-f5c3-44c3-94bd-fd257edb7f2e',
        appearance: isDark ? 'dark' : 'light', // 리액트의 isDark 상태와 연동
      });
    }

    return () => {
      if (window.ChannelIO) {
        window.ChannelIO('shutdown');
      }
    };
  }, [isDark]); // isDark가 바뀔 때마다 채널톡 테마도 즉시 변경됨
  // --- 채널톡 로직 시작 ---
  // useEffect(() => {
  //   const loadChannelTalk = () => {
  //     var w = window;
  //     if (w.ChannelIO) return;
  //     var ch = function () {
  //       ch.c(arguments);
  //     };
  //     ch.q = [];
  //     ch.c = function (args) {
  //       ch.q.push(args);
  //     };
  //     w.ChannelIO = ch;
  //     function l() {
  //       if (w.ChannelIOInitialized) return;
  //       w.ChannelIOInitialized = true;
  //       var s = document.createElement('script');
  //       s.type = 'text/javascript';
  //       s.async = true;
  //       s.src = 'https://cdn.channel.io/dot/ch-plugin-web.js';
  //       s.charset = 'UTF-8';
  //       var x = document.getElementsByTagName('script')[0];
  //       x.parentNode.insertBefore(s, x);
  //     }
  //     if (document.readyState === 'complete') l();
  //     else {
  //       window.addEventListener('DOMContentLoaded', l, false);
  //       window.addEventListener('load', l, false);
  //     }
  //   };

  //   loadChannelTalk();

  //   // 채널톡 실행 (부팅)
  //   window.ChannelIO('boot', {
  //     pluginKey: 'e5aabd3f-f5c3-44c3-94bd-fd257edb7f2e', // 여기에 실제 플러그인 키를 넣으세요
  //     appearance: isDark ? 'dark' : 'light', // 현재 테마 모드에 맞춰 채널톡 색상도 변경됨
  //   });

  //   return () => {
  //     window.ChannelIO('shutdown');
  //   };
  // }, [isDark]); // 테마가 바뀔 때마다 채널톡 색상도 동기화됩니다.
  // // --- 채널톡 로직 끝 ---

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

        {/* 데스크탑 메뉴 */}
        <nav className="nav-desktop">
          <Link to="/audit" className="nav-audit-btn">
            무료 웹 진단
          </Link>

          {/* 🚀 데스크탑 템플릿 메뉴 추가 */}
          <Link to="/templates">템플릿</Link>

          <Link to="/portfolio">포트폴리오</Link>
          <Link to="/contact">프로젝트 의뢰</Link>
          <button className="theme-toggle" onClick={() => setIsDark(!isDark)}>
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
