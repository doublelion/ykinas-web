import React from 'react';
import { Monitor, ShoppingCart, Settings } from 'lucide-react';
import Map from '../components/Map'; // 지도 컴포넌트 (있을 경우)
import Button from '../components/Button'; // 경로 확인 필요
import '../style/Home.scss';

function Home() {
  const handleInquiry = () => {
    window.location.href = '/contact';
  };

  return (
    <div className="home-container">
      {/* 히어로 섹션 */}
      <header className="hero">
        <h2>
          Next Generation <br /> <span className="highlight">IT Solution</span>
        </h2>
        <p className="hero-desc">
          와이키나스는 홈페이지 제작부터 쇼핑몰 구축까지, 귀사의 비즈니스를
          디지털로 전환하는 최적의 파트너입니다.
        </p>
        <Button text="프로젝트 문의하기" onClick={handleInquiry} />
      </header>

      {/* 서비스 섹션 */}
      <section id="services" className="service-grid">
        <div className="service-card">
          <Monitor color="#00f2ff" size={40} />
          <h3>홈페이지 제작</h3>
          <p>
            브랜드 아이덴티티를 반영한
            <br />            
            완성도 높은 디지털 결과물을 제작합니다.
          </p>
        </div>

        <div className="service-card">
          <ShoppingCart color="#00f2ff" size={40} />
          <h3>쇼핑몰 구축</h3>
          <p>
            결제·상품·주문 관리까지 고려한
            <br />
            안정적인 이커머스 환경을 구축합니다.
          </p>
        </div>

        <div className="service-card">
          <Settings color="#00f2ff" size={40} />
          <h3>유지보수 &amp; 관리</h3>
          <p>
            오류 수정, 콘텐츠 변경, 기능 개선 등<br />
            지속적인 웹사이트 관리를 지원합니다.
          </p>
        </div>
      </section>

      {/* 오시는 길 (지도) - Footer 바로 위에 위치 */}
      <Map />
    </div>
  );
}

export default Home;
