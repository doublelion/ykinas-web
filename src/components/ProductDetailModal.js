import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import '../style/ProductDetailModal.scss';

const ProductDetailModal = ({ project, onClose }) => {
  // 1. DB 동적 연동: projects 테이블에 추가할 detail_images 컬럼(배열) 활용
  const detailImages = project.detail_images || [];
  const scrollRef = useRef(null);

  // 2. 가로 스크롤 최적화: PC에서 휠 이벤트를 가로 방향으로 변환 (GPU 하드웨어 가속 대응)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      // 데스크톱(768px 이상)에서만 가로 스크롤 맵핑
      if (window.innerWidth >= 768) {
        e.preventDefault();
        el.scrollBy({ left: e.deltaY * 1.2, behavior: 'auto' });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const modalContent = (
    <div className="product-modal-overlay" onClick={onClose}>
      <div className="product-modal-container" onClick={(e) => e.stopPropagation()}>

        <header className="modal-header">
          <div>
            <span className="category">{project.category}</span>
            <h2>{project.title}</h2>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </header>

        {/* 휠 이벤트가 바인딩되는 스크롤 컨테이너 */}
        <div className="modal-content-scroll" ref={scrollRef}>
          <div className="horizontal-layout">
            {detailImages.map((imgUrl, idx) => (
              <div key={idx} className="detail-grid-item">
                <img src={imgUrl} alt={`${project.title} 상세컷 ${idx + 1}`} loading="lazy" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.getElementById('modal-root') || document.body);
};

export default ProductDetailModal;