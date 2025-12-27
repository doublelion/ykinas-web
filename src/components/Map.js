import React, { useEffect } from 'react';

function Map() {
  useEffect(() => {
    const { kakao } = window;

    // kakao 객체가 있고, maps 기능이 있는지 확인
    if (kakao && kakao.maps) {
      // autoload=false를 사용했으므로 load() 콜백 안에서 실행하는 것이 안전합니다.
      kakao.maps.load(() => {
        const container = document.getElementById('map');
        if (!container) return; // 컨테이너가 없으면 중단

        // 와이키나스 실제 위치
        const companyPos = new kakao.maps.LatLng(37.49394, 126.72572);

        const options = {
          center: companyPos,
          level: 3,
        };

        const map = new kakao.maps.Map(container, options);

        // 마커 추가
        const marker = new kakao.maps.Marker({
          position: companyPos,
        });
        marker.setMap(map);

        // 주소 팝업 (InfoWindow)
        const infoWindow = new kakao.maps.InfoWindow({
          content: `
          <div style="position:relative;">
            <div style="
              background:#111;
              color:#fff;
              padding:14px 16px;
              border-radius:10px;
              font-size:14px;
              line-height:1.5;
              box-shadow:0 10px 30px rgba(0,0,0,0.6);
              border:1px solid rgba(255,255,255,0.12);
              min-width:220px;
            ">
              <strong style="
                display:block;
                font-size:15px;
                margin-bottom:6px;
                letter-spacing:0.05em;
              ">
                YKINAS
              </strong>
              인천 부평구 시장로 33<br/>
              한남시티프라자 7층
              <a 
          href="https://map.kakao.com/link/to/와이키나스,37.49394,126.72572"
          target="_blank"
          style="
            display:inline-block;
            margin-top:8px;
            font-size:13px;
            color:#7dd3fc;
            text-decoration:none;
          "
        >
          길찾기 →
        </a>
            </div>

            <!-- 꼬리 -->
            <div style="
              position:absolute;
              bottom:-8px;
              left:50%;
              transform:translateX(-50%);
              width:0;
              height:0;
              border-left:8px solid transparent;
              border-right:8px solid transparent;
              border-top:8px solid #111;
            "></div>
          </div>
          `,
          position: companyPos,
        });

        // 처음부터 열어두기
        infoWindow.open(map, marker);

        marker.setMap(map);

        // 반응형 대응: 윈도우 리사이즈 시 중심 유지
        const handleResize = () => {
          map.setCenter(companyPos);
        };
        window.addEventListener('resize', handleResize);

        // 클린업 함수
        return () => window.removeEventListener('resize', handleResize);
      });
    }
  }, []);

  return (
    <section className="map-section">
      <h3
        style={{
          fontSize: 'clamp(2.4rem, 5vw, 3.2rem)',
          color: '#fff',
          marginBottom: '4rem',
          textAlign: 'center',
          letterSpacing: '0.2rem',
        }}
      >
        LOCATION
      </h3>

      <div
        id="map"
        style={{
          width: '100%',
          maxWidth: '1200px',
          height: '45rem',
          margin: '0 auto',
          borderRadius: '1.2rem',
          
          backgroundColor: '#111', // 로드 전 검은 배경
        }}
      ></div>
    </section>
  );
}

export default Map;
