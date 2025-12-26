import React from 'react';
import { Monitor, ShoppingCart} from 'lucide-react';
import Map from '../components/Map'; // 지도 컴포넌트 (있을 경우)
import Button from '../components/Button'; // 경로 확인 필요
import '../style/Home.scss'

function Home() {
  const handleInquiry = () => {
    window.location.href = '/Contact'; 
  };

  return (
    <div className="home-container">
      {/* 히어로 섹션 */}
      <header className="hero">
        <h2>Next Generation <br/> <span className="highlight">IT Solution</span></h2>
        <p className="hero-desc">
          와이키나스는 홈페이지 제작부터 쇼핑몰 구축까지, 
          귀사의 비즈니스를 디지털로 전환하는 최적의 파트너입니다.
        </p>
        <Button 
          text="프로젝트 문의하기" 
          onClick={handleInquiry} 
        />
      </header>

      {/* 서비스 섹션 */}
      <section id="services" className="service-grid">
        <div className="service-card">
          <Monitor color="#00f2ff" size={40} />
          <h3>홈페이지 제작</h3>
          <p>기업의 아이덴티티를 담은 반응형 웹사이트를 구축합니다.</p>
        </div>
        <div className="service-card">
          <ShoppingCart color="#00f2ff" size={40} />
          <h3>쇼핑몰 솔루션</h3>
          <p>안정적이고 강력한 이커머스 시스템을 제공합니다.</p>
        </div>
      </section>

      {/* 오시는 길 (지도) - Footer 바로 위에 위치 */}
      <Map />
    </div>
  );
}

export default Home;