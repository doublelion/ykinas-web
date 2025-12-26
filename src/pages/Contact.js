import React, { useState } from 'react';
import '../style/Contact.scss';

function Contact() {
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태 추가
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    type: 'consulting',
    message: '',
    agreement: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Netlify 폼 제출을 위한 헬퍼 함수 (AJAX 방식)
  const encode = (data) => {
    return Object.keys(data)
      .map(key => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
      .join("&");
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true); // 로딩 시작
    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encode({ "form-name": "project-inquiry", ...formData })
    })
      .then(() => {
        alert("문의가 정상적으로 접수되었습니다.");
        setIsLoading(false); // 로딩 종료
        setFormData({ name: '', contact: '', type: 'consulting', message: '', agreement: false }); // 폼 초기화
      })
      .catch(error => {
        alert("오류가 발생했습니다.");
        setIsLoading(false);
      });

    e.preventDefault();
  };

  return (
    <section className="contact-section">
      <div className="container">
        <div className="contact-header">
          <span className="sub-title">CONTACT US</span>
          <h1 className="main-title">프로젝트 의뢰</h1>
          <p className="desc">
            와이키나스와 함께 비즈니스의 가치를 높여보세요.<br/>
            문의를 남겨주시면 담당자가 신속히 연락드립니다.
          </p>
        </div>

        <form 
          name="project-inquiry" 
          onSubmit={handleSubmit}
          data-netlify="true" 
          className="contact-form"
        >
          {/* Netlify 인식용 히든 필드 */}
          <input type="hidden" name="form-name" value="project-inquiry" />

          <div className="input-row">
            <div className="input-group">
              <label>성함 / 기업명</label>
              <input 
                type="text" name="name" 
                value={formData.name} onChange={handleChange} 
                required placeholder="성함을 입력해주세요" 
              />
            </div>
            <div className="input-group">
              <label>연락처 / 이메일</label>
              <input 
                type="text" name="contact" 
                value={formData.contact} onChange={handleChange} 
                required placeholder="연락받으실 정보를 입력해주세요" 
              />
            </div>
          </div>

          <div className="input-group">
            <label>문의 유형</label>
            <select name="type" value={formData.type} onChange={handleChange}>
              <option value="consulting">IT 컨설팅</option>
              <option value="software">소프트웨어 개발</option>
              <option value="maintenance">유지보수 / 기타</option>
            </select>
          </div>

          <div className="input-group">
            <label>의뢰 내용</label>
            <textarea 
              name="message" 
              value={formData.message} onChange={handleChange} 
              required placeholder="구상 중이신 프로젝트에 대해 자유롭게 적어주세요." 
              rows="6"
            ></textarea>
          </div>

          <div className="agreement-group">
            <input 
              type="checkbox" id="agreement" name="agreement" 
              checked={formData.agreement} onChange={handleChange} 
              required 
            />
            <label htmlFor="agreement">개인정보 수집 및 이용에 동의합니다.</label>
          </div>

          <button type="submit" className={`submit-btn ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
          {isLoading ? (
            <div className="spinner"></div> // 로딩 애니메이션
          ) : (
            <>
              <span>의뢰하기</span>
              <i className="arrow-icon">→</i>
            </>
          )}
        </button>
        </form>
      </div>
    </section>
  );
}

export default Contact;