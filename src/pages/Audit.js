import React, { useState, useEffect } from 'react';
import { Zap, ShieldCheck, Loader2, Search, ArrowRight } from 'lucide-react';
import emailjs from '@emailjs/browser';
import Button from '../components/Button';
import '../style/Audit.scss';

function Audit() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [contact, setContact] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0); // 게이지 상태 추가

  const steps = [
    '구글 라이트하우스 엔진 연결 중...',
    '사이트 아키텍처 스캔 중...',
    '성능 및 SEO 지표 분석 중...',
    '최적화 솔루션 도출 중...',
  ];

  // 넷리파이
  // const handleFormSubmit = async (e) => {
  //   e.preventDefault();

  //   // FormData 생성 시 이벤트 타겟(e.target)을 직접 참조
  //   const myForm = e.target;
  //   const formData = new FormData(myForm);

  //   // 현재 상태값들을 명시적으로 추가 (확인 사살)
  //   formData.set('form-name', 'audit-consulting');
  //   formData.set('contact-info', contact);
  //   formData.set('target-url', url);
  //   formData.set('perf-score', (result?.performance?.score * 100).toFixed(0));
  //   formData.set('seo-score', (result?.seo?.score * 100).toFixed(0));

  //   try {
  //     await fetch('/audit', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  //       body: new URLSearchParams(formData).toString(),
  //     });
  //     alert(
  //       '와이키나스 전문가에게 분석 요청이 전송되었습니다. 24시간 내에 연락드릴게요!',
  //     );
  //     setContact('');
  //   } catch (error) {
  //     alert('전송 중 오류가 발생했습니다. 다시 시도해 주세요.');
  //   }
  // };

  // Audit.js의 handleFormSubmit 부분 수정 (버셀)
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // EmailJS 템플릿의 {{변수}}와 이름이 똑같아야 합니다.
    const templateParams = {
      'contact-info': contact,
      'target-url': url,
      'perf-score': (result?.performance?.score * 100).toFixed(0),
      'seo-score': (result?.seo?.score * 100).toFixed(0),
    };

    try {
      await emailjs.send(
        'service_6wxvcrc', // EmailJS 서비스 ID
        'template_qxqeirs', // EmailJS 템플릿 ID
        templateParams,
        'xTdCAigWnc9dXZrNQ', // EmailJS 퍼블릭 키
      );

      alert('와이키나스 전문가에게 분석 요청이 전송되었습니다!');
      setContact('');
    } catch (error) {
      console.error('EmailJS Error:', error);
      alert('전송 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev));
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // 1. runAudit 함수 수정 (게이지 애니메이션 추가)
  const runAudit = async (e) => {
    e.preventDefault();

    // 입력된 값 앞뒤 공백 제거
    let targetUrl = url.trim();
    if (!targetUrl) return;

    // "ykinas.com"만 쳐도 "https://ykinas.com"으로 변환해주는 유연함!
    if (!targetUrl.startsWith('http')) {
      targetUrl = `https://${targetUrl}`;
    }

    setLoading(true);
    setResult(null);
    setAnalysisProgress(0);

    // 1. 게이지를 0.15초마다 1%씩 부드럽게 올리는 타이머
    const progressTimer = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 92) {
          // 92%에서 잠시 대기 (데이터 올 때까지)
          return 92;
        }
        return prev + 1;
      });
    }, 150);

    // 2. 로딩 메시지 단계별 변경 (기존 steps 활용)
    const stepTimer = setInterval(() => {
      setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 3000);

    const API_KEY = process.env.REACT_APP_PAGESPEED_API_KEY;

    try {
      const response = await fetch(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${targetUrl}&category=PERFORMANCE&category=SEO&key=${API_KEY}`,
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      // 데이터 도착 완료! 게이지 100%로 채우기
      clearInterval(progressTimer);
      clearInterval(stepTimer);
      setAnalysisProgress(100);

      // 0.5초 뒤 결과 화면으로 전환
      setTimeout(() => {
        setResult(data.lighthouseResult.categories);
        setLoading(false);
      }, 500);
    } catch (error) {
      clearInterval(progressTimer);
      clearInterval(stepTimer);
      alert('진단 실패: URL을 확인해주세요.');
      setLoading(false);
    }
  };

  // 2. 하단 return 부분의 로딩 화면(audit-dim) 수정
  return (
    <div className="audit-container">
      {loading && (
        <div className="audit-dim">
          <div className="scanner-box">
            <div className="radar">
              <div className="radar-beam"></div>
              <div className="radar-dot"></div>
            </div>
            <h2 className="loading-text">{steps[loadingStep]}</h2>
            <p>데이터를 정밀 분석 중입니다. 잠시만 기다려주세요.</p>

            {/* 가로 그래프 게이지 */}
            <div className="progress-bar-container">
              <div
                className="progress-fill"
                style={{
                  width: `${analysisProgress}%`, // loadingStep 대신 analysisProgress 사용!
                  transition: 'width 0.2s ease-out',
                }}
              ></div>
            </div>
            <p
              style={{
                color: '#3b82f6',
                marginTop: '10px',
                fontWeight: 'bold',
              }}
            >
              {analysisProgress}%
            </p>
          </div>
        </div>
      )}

      <div className="audit-wrapper">
        <header className="audit-header">
          <span className="sub-title">AI-BASED ANALYSIS</span>
          <h1>
            고치지 않아도 되는 <br />{' '}
            <span className="highlight">웹사이트를 만듭니다</span>
          </h1>
          <p>전환율을 가로막는 병목 구간을 데이터로 증명합니다.</p>
        </header>

        <form onSubmit={runAudit} className="modern-search-bar">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="분석할 URL을 입력하세요 (예: ykinas.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            // 하이픈(-), 숫자, 여러 단계의 도메인(.vercel.app 등)을 모두 허용하는 유연한 패턴
            pattern="^(?:https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}(?:\/.*)?$"
            onInvalid={(e) =>
              e.target.setCustomValidity(
                'ykinas.com 또는 임시 주소 형식으로 입력해주세요.',
              )
            }
            onInput={(e) => e.target.setCustomValidity('')}
          />
          <button type="submit" disabled={loading}>
            분석 시작
          </button>
        </form>

        {result && (
          <div className="audit-results slide-up">
            <div className="result-grid">
              <div
                className={`score-card ${result.performance.score < 0.5 ? 'low' : ''}`}
              >
                <Zap size={40} className="icon" />
                <h3>성능(Performance)</h3>
                <div className="score-val">
                  {(result.performance.score * 100).toFixed(0)}
                </div>
              </div>
              <div className="score-card">
                <ShieldCheck size={40} className="icon" />
                <h3>최적화(SEO)</h3>
                <div className="score-val">
                  {(result.seo.score * 100).toFixed(0)}
                </div>
              </div>
            </div>

            <div className="consulting-cta">
              <div className="cta-content">
                <h2>"점수보다 중요한 건 전환의 흐름입니다."</h2>
                <p>
                  전문가가 직접 구조를 분석한 1:1 리포트를 무료로 보내드립니다.
                </p>
              </div>
              <form className="cta-form" onSubmit={handleFormSubmit}>
                {/* 이제 hidden input들은 필요 없습니다. 
      templateParams에서 데이터를 바로 넘겨주고 있기 때문입니다. */}
                <input
                  type="text"
                  placeholder="연락처 또는 이메일"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  required
                />
                <button type="submit">
                  무료 제안서 받기 <ArrowRight size={18} />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Audit;
