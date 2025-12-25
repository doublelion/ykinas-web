import React, { useEffect } from 'react';

function Map() {
  useEffect(() => {
    // 카카오 지도 API 로드 후 실행
    // const container = document.getElementById('map');
    // const options = {
    //   center: new window.kakao.maps.LatLng(33.450701, 126.570667), // 회사 좌표로 수정
    //   level: 3
    // };
    // const map = new window.kakao.maps.Map(container, options);
    
    // // 마커 추가
    // const markerPosition = new window.kakao.maps.LatLng(33.450701, 126.570667);
    // const marker = new window.kakao.maps.Marker({ position: markerPosition });
    // marker.setMap(map);
  }, []);

  return (
    <section className="map-section">
      <h3>오시는 길</h3>
      <div id="map" style={{ width: '100%', height: '400px', borderRadius: '20px' }}></div>
    </section>
  );
}

export default Map;