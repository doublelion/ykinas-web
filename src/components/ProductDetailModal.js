import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import '../style/ProductDetailModal.scss'; // 하단의 SCSS 적용 필요

// [최적화] IntersectionObserver 커스텀 훅 (2만 px 렌더링 방어)
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

// 개별 섹션 컴포넌트 (모바일 퍼스트 비정형 그리드 적용)
const DetailSection = ({ imgUrl, gridClass }) => {
  const [ref, isVisible] = useLazyReveal();

  return (
    <div ref={ref} className={`editorial-grid-item ${gridClass} ${isVisible ? 'revealed' : ''}`}>
      {isVisible && <img src={imgUrl} alt="상세 컷" />}
    </div>
  );
};

const ProductDetailModal = ({ project, onClose }) => {
  // 실제 프로젝트에서는 project.id를 기반으로 분할된 WebP 이미지 배열을 DB나 스토리지에서 가져옵니다.
  const dummyDetailImages = [
    { id: 1, url: 'https://[본인프로젝트URL]/storage/v1/object/public/portfolio/product_detail/scal_prep_01.webp', type: 'span-2' },
    { id: 2, url: 'https://[본인프로젝트URL]/storage/v1/object/public/portfolio/product_detail/scal_prep_02.webp', type: 'normal' },
    { id: 3, url: 'https://[본인프로젝트URL]/storage/v1/object/public/portfolio/product_detail/scal_prep_03.webp', type: 'tall' },
    { id: 4, url: 'https://[본인프로젝트URL]/storage/v1/object/public/portfolio/product_detail/scal_prep_04.webp', type: 'normal' },
    { id: 5, url: 'https://[본인프로젝트URL]/storage/v1/object/public/portfolio/product_detail/scal_prep_05.webp', type: 'span-2-tall' },
    { id: 6, url: 'https://[본인프로젝트URL]/storage/v1/object/public/portfolio/product_detail/scal_prep_06.webp', type: 'normal' },
    { id: 7, url: 'https://[본인프로젝트URL]/storage/v1/object/public/portfolio/product_detail/scal_prep_07.webp', type: 'tall' },
    { id: 8, url: 'https://[본인프로젝트URL]/storage/v1/object/public/portfolio/product_detail/scal_prep_08.webp', type: 'normal' },
    { id: 9, url: 'https://[본인프로젝트URL]/storage/v1/object/public/portfolio/product_detail/scal_prep_09.webp', type: 'span-2' },
  ];

  // 모달 오픈 시 배경 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
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

        <div className="modal-content-scroll">
          {/* 에디토리얼 스타일의 비정형 격자 컨테이너 */}
          <div className="editorial-layout">
            {dummyDetailImages.map((img) => (
              <DetailSection key={img.id} imgUrl={img.url} gridClass={img.type} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );

  // React Portal을 사용하여 root 밖으로 모달 렌더링 (z-index 충돌 원천 차단)
  return ReactDOM.createPortal(modalContent, document.getElementById('modal-root') || document.body);
};

export default ProductDetailModal;