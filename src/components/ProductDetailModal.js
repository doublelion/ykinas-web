import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import '../style/ProductDetailModal.scss';

// [최적화] IntersectionObserver 커스텀 훅
const useLazyReveal = (options = { threshold: 0.1 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, options);

    const currentElement = elementRef.current;
    if (currentElement) observer.observe(currentElement);

    return () => {
      if (currentElement) observer.unobserve(currentElement);
    };
  }, [options]);

  return [elementRef, isVisible];
};

// ✅ 클래스명을 detail-grid-item으로 통일하고, 드래그 시 이미지 고스트 현상 방지(draggable="false")
const DetailSection = ({ imgUrl }) => {
  const [ref, isVisible] = useLazyReveal();

  return (
    <div ref={ref} className={`detail-grid-item ${isVisible ? 'revealed' : ''}`}>
      {isVisible && <img src={imgUrl} alt="상세 컷" draggable="false" />}
    </div>
  );
};

const ProductDetailModal = ({ project, onClose }) => {
  const dummyDetailImages = [
    { id: 1, url: 'https://ipgzyckubwakijerxcpc.supabase.co/storage/v1/object/public/portfolio/product_detail/scal_prep_01.webp' },
    { id: 2, url: 'https://ipgzyckubwakijerxcpc.supabase.co/storage/v1/object/public/portfolio/product_detail/scal_prep_02.webp' },
    { id: 3, url: 'https://ipgzyckubwakijerxcpc.supabase.co/storage/v1/object/public/portfolio/product_detail/scal_prep_03.webp' },
    { id: 4, url: 'https://ipgzyckubwakijerxcpc.supabase.co/storage/v1/object/public/portfolio/product_detail/scal_prep_04.webp' },
    { id: 5, url: 'https://ipgzyckubwakijerxcpc.supabase.co/storage/v1/object/public/portfolio/product_detail/scal_prep_05.webp' },
    { id: 6, url: 'https://ipgzyckubwakijerxcpc.supabase.co/storage/v1/object/public/portfolio/product_detail/scal_prep_06.webp' },
    { id: 7, url: 'https://ipgzyckubwakijerxcpc.supabase.co/storage/v1/object/public/portfolio/product_detail/scal_prep_07.webp' },
    { id: 8, url: 'https://ipgzyckubwakijerxcpc.supabase.co/storage/v1/object/public/portfolio/product_detail/scal_prep_08.webp' },
    { id: 9, url: 'https://ipgzyckubwakijerxcpc.supabase.co/storage/v1/object/public/portfolio/product_detail/scal_prep_09.webp' },
  ];

  const scrollRef = useRef(null);

  // 드래그 스크롤 상태 관리
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // 모달 오픈 시 배경 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  // 1) 마우스 휠을 가로 스크롤로 매핑
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      if (window.innerWidth >= 768 && e.deltaY !== 0) {
        e.preventDefault();
        el.scrollBy({ left: e.deltaY * 1.5, behavior: 'auto' });
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // 2) 드래그 이벤트 핸들러
  const handleMouseDown = (e) => {
    if (window.innerWidth < 768) return; // 모바일은 네이티브 터치 사용
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // 스크롤 속도 가속
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

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

        <div className="scroll-indicator">
          <div className="mouse-icon"><span className="wheel"></span></div>
          <span>Scroll & Drag to View</span>
        </div>

        {/* ✅ 드래그 이벤트 바인딩 및 cursor 제어를 위한 active 클래스 추가 */}
        <div
          className={`modal-content-scroll ${isDragging ? 'active' : ''}`}
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          {/* ✅ editorial-layout 대신 horizontal-layout 적용 */}
          <div className="horizontal-layout">
            {dummyDetailImages.map((img) => (
              <DetailSection key={img.id} imgUrl={img.url} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.getElementById('modal-root') || document.body);
};

export default ProductDetailModal;