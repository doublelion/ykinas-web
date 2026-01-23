import React, { useState, useEffect, useRef } from 'react';
import { MoveRight, X } from 'lucide-react';
import './AristideV1.scss';

const AristideV1 = ({ data, onClose, onInquiry }) => {
  // 🚀 [규칙 1] 모든 Hook은 반드시 컴포넌트 최상단에 순서대로 선언해야 합니다.
  const [activeId, setActiveId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const cursorRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    const moveCursor = (e) => {
      if (cursorRef.current && !isMobile) {
        cursorRef.current.style.left = `${e.clientX}px`;
        cursorRef.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener('mousemove', moveCursor);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', moveCursor);
    };
  }, [isMobile]);

  // 
  
  // 🚀 [규칙 2] 조건부 리턴(Early Return)은 모든 Hook 선언이 끝난 뒤에 위치해야 합니다.
  if (!data || !data.subProjects) {
    return (
      <div style={{ 
        width: '100vw', height: '100vh', background: '#000', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' 
      }}>
        LOADING PROJECT...
      </div>
    );
  }

  const subProjects = data.subProjects || [];
  const selectedProject = subProjects.find((p) => p.id === selectedId);

  return (
    <div className={`aristide-v1-wrapper ${selectedId ? 'project-selected' : ''}`}>
      {!isMobile && <div ref={cursorRef} className="custom-cursor" />}

      <header className="header">
        <div className="header-container">
          {!selectedId ? (
            <div className="logo" onClick={onClose}>
              <h1>{data.title}</h1>
              <p>CLOSE PORTFOLIO</p>
            </div>
          ) : (
            <div className="btn-wrapper">
              <button 
                className="detail-close-btn" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedId(null);
                  setActiveId(null);
                }}
              >
                <X size={isMobile ? 24 : 32} />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="main-engine">
        {subProjects.map((project) => (
          <div
            key={project.id}
            className={`column 
              ${activeId === project.id ? 'active' : ''} 
              ${selectedId === project.id ? 'selected' : ''} 
              ${selectedId && selectedId !== project.id ? 'hidden' : ''}
            `}
            onMouseEnter={() => !isMobile && !selectedId && setActiveId(project.id)}
            onMouseLeave={() => !isMobile && !selectedId && setActiveId(null)}
            onClick={() => setSelectedId(project.id)}
          >
            <div className="image-container">
              <img src={project.image} alt={project.title} />
            </div>

            {!selectedId && !isMobile && (
              <div className="hover-reveal-content">
                <div className="meta-row">
                  <span className="cat">{project.category}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide-minus"><path d="M5 12h14"></path></svg>
                  <span className="yr">{project.year}</span>
                </div>
                <div className="outline-title">
                  <h2>{project.title}</h2>
                </div>
              </div>
            )}
          </div>
        ))}

        {selectedId && selectedProject && (
          <div className="info-panel">
            <div className="content-box">
              <p className="work-label">SELECTED WORK</p>
              <h1 className="selected-title">{selectedProject.title}</h1>
              <p className="description">{selectedProject.description}</p>
              <div className="meta-info">
                <p className="label">CATEGORY</p>
                <p className="value">{selectedProject.category} / {selectedProject.year}</p>
              </div>
              <button className="inquiry-btn" onClick={onInquiry}>
                COLLABORATION INQUIRY <MoveRight size={22} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AristideV1;