import React, { useEffect } from 'react';

function Map() {
  useEffect(() => {
    const { kakao } = window;
    if (kakao && kakao.maps) {
      kakao.maps.load(() => {
        const container = document.getElementById('map');
        if (!container) return;

        const companyPos = new kakao.maps.LatLng(37.49394, 126.72572);
        const options = { center: companyPos, level: 3 };
        const map = new kakao.maps.Map(container, options);
        const marker = new kakao.maps.Marker({ position: companyPos });
        marker.setMap(map);

        // 현재 테마 확인 (라이트/다크 분기용)
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const infoBg = isDark ? '#111' : '#ffffff';
        const infoText = isDark ? '#ffffff' : '#1a2b2f';
        const infoBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
        const linkColor = isDark ? '#007bff' : '#007bff';

        const infoWindow = new kakao.maps.InfoWindow({
          content: `
          <div class="map-info-window" style="position:relative; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.1));">
            <div style="
              background:${infoBg};
              color:${infoText};
              padding:14px 16px;
              border-radius:10px;
              font-size:14px;
              line-height:1.5;
              border:1px solid ${infoBorder};
              min-width:220px;
            ">
              <strong style="display:block; font-size:15px; margin-bottom:6px;">YKINAS</strong>
              인천 부평구 시장로 33<br/>
              한남시티프라자 7층
              <a href="https://map.kakao.com/link/to/와이키나스,37.49394,126.72572" target="_blank" style="display:inline-block; margin-top:8px; font-size:13px; color:${linkColor}; text-decoration:none; font-weight:bold;">
                길찾기 →
              </a>
            </div>
            <div style="position:absolute; bottom:-8px; left:50%; transform:translateX(-50%); width:0; height:0; border-left:8px solid transparent; border-right:8px solid transparent; border-top:8px solid ${infoBg};"></div>
          </div>
          `,
          position: companyPos,
        });

        infoWindow.open(map, marker);

        const handleResize = () => map.setCenter(companyPos);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
      });
    }
  }, []); // 테마 변경 시 InfoWindow 리렌더링이 필요하다면 isDark를 의존성에 넣을 수 있습니다.

  return (
    <section className="map-section">
      <h3 className="section-title-sub">LOCATION</h3>
      <div id="map" className="kakao-map-container"></div>
    </section>
  );
}

export default Map;