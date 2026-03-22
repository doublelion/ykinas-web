import React, { useState, useEffect } from 'react';
import { Zap, ShieldCheck, Search, ArrowRight } from 'lucide-react';
import emailjs from '@emailjs/browser';
import '../style/Audit.scss';

function Audit() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [contact, setContact] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const steps = [
    '구글 라이트하우스 엔진 연결 중...',
    '사이트 아키텍처 스캔 중...',
    '성능 및 SEO 지표 분석 중...',
    '최적화 솔루션 도출 중...',
  ];

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const templateParams = {
      user_name: '성능 분석 요청',
      user_contact: contact,
      target_url: url,
      performance_score: (result?.performance?.score * 100).toFixed(0),
      seo_score: (result?.seo?.score * 100).toFixed(0),
      inquiry_type: '사이트 진단',
      user_message: '상세 분석 리포트 요청입니다.',
    };

    try {
      await emailjs.send(
        'service_6wxvcrc',
        'template_qxqeirs',
        templateParams,
        'xTdCAigWnc9dXZrNQ',
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

  const runAudit = async (e) => {
    e.preventDefault();
    let targetUrl = url.trim();
    if (!targetUrl) return;

    if (!targetUrl.startsWith('http')) {
      targetUrl = `https://${targetUrl}`;
    }

    setLoading(true);
    setResult(null);
    setAnalysisProgress(0);

    const progressTimer = setInterval(() => {
      setAnalysisProgress((prev) => (prev >= 92 ? 92 : prev + 1));
    }, 150);

    const stepTimer = setInterval(() => {
      setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 3000);

    const API_KEY = process.env.REACT_APP_PAGESPEED_API_KEY;

    try {
      const response = await fetch(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${targetUrl}&category=PERFORMANCE&category=SEO&key=${API_KEY}`,
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || '분석 중 오류가 발생했습니다.');
      }

      clearInterval(progressTimer);
      clearInterval(stepTimer);
      setAnalysisProgress(100);

      setTimeout(() => {
        setResult(data.lighthouseResult.categories);
        setLoading(false);
      }, 500);
    } catch (error) {
      clearInterval(progressTimer);
      clearInterval(stepTimer);
      alert(`진단 실패: ${error.message}`);
      setLoading(false);
    }
  };

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
            <div className="progress-bar-container">
              <div
                className="progress-fill"
                style={{
                  width: `${analysisProgress}%`,
                  transition: 'width 0.2s ease-out',
                }}
              ></div>
            </div>
            <p style={{ color: '#3b82f6', marginTop: '10px', fontWeight: 'bold' }}>
              {analysisProgress}%
            </p>
          </div>
        </div>
      )}

      <div className="audit-wrapper">
        <header className="audit-header">
          <span className="sub-title">AI-BASED ANALYSIS</span>
          <h1>
            고치지 않아도 되는 <br /> <span className="highlight">웹사이트를 만듭니다</span>
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
            pattern="^(?:https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}(?:\/.*)?$"
            onInvalid={(e) => e.target.setCustomValidity('유효한 도메인 주소 형식으로 입력해주세요.')}
            onInput={(e) => e.target.setCustomValidity('')}
          />
          <button type="submit" disabled={loading}>
            분석 시작
          </button>
        </form>

        {result && (
          <div className="audit-results slide-up">
            <div className="result-grid">
              <div className={`score-card ${result.performance.score < 0.5 ? 'low' : ''}`}>
                <Zap size={40} className="icon" />
                <h3>성능(Performance)</h3>
                <div className="score-val">{(result.performance.score * 100).toFixed(0)}</div>
              </div>
              <div className="score-card">
                <ShieldCheck size={40} className="icon" />
                <h3>최적화(SEO)</h3>
                <div className="score-val">{(result.seo.score * 100).toFixed(0)}</div>
              </div>
            </div>

            <div className="consulting-cta">
              <div className="cta-content">
                <h2>"점수보다 중요한 건 전환의 흐름입니다."</h2>
                <p>전문가가 직접 구조를 분석한 1:1 리포트를 무료로 보내드립니다.</p>
              </div>
              <form className="cta-form" onSubmit={handleFormSubmit}>
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