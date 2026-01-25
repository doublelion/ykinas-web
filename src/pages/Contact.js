import React, { useState } from 'react';
import emailjs from '@emailjs/browser';
import '../style/Contact.scss';
import Map from '../components/Map'; // 만들어두신 커스텀 지도 컴포넌트

function Contact() {
  const [isLoading, setIsLoading] = useState(false);
  
  // 폼 데이터 상태
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    type: '브랜드 웹사이트 및 커머스 구축',
    message: '',
    agreement: false,
  });

  // 핸들러 함수들
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

    const templateParams = {
      user_name: formData.name,
      user_contact: formData.contact,
      inquiry_type: formData.type,
      user_message: formData.message,
      target_url: '-',
      performance_score: '-',
      seo_score: '-',
    };

    emailjs
      .send('service_6wxvcrc', 'template_qxqeirs', templateParams, 'xTdCAigWnc9dXZrNQ')
      .then(() => {
        alert('문의가 정상적으로 접수되었습니다!');
        setIsLoading(false);
        setFormData({
          name: '',
          contact: '',
          type: '브랜드 웹사이트 및 커머스 구축',
          message: '',
          agreement: false,
        });
      })
      .catch((err) => {
        console.error(err);
        alert('오류가 발생했습니다.');
        setIsLoading(false);
      });
  };

  return (
    <section className="contact-section">
      <div className="container">
        <div className="contact-header">
          <span className="sub-title">CONTACT US</span>
          <h1 className="main-title">프로젝트 의뢰</h1>
          <p className="desc">
            와이키나스와 함께 비즈니스의 가치를 높여보세요.
            <br />
            문의를 남겨주시면 담당자가 신속히 연락드립니다.
          </p>
        </div>

        <div className="contact-grid">
          {/* 의뢰 폼 섹션 */}
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="input-row">
              <div className="input-group">
                <label>성함 / 기업명</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="성함을 입력해주세요" />
              </div>
              <div className="input-group">
                <label>연락처 / 이메일</label>
                <input type="text" name="contact" value={formData.contact} onChange={handleChange} required placeholder="연락받으실 정보를 입력해주세요" />
              </div>
            </div>

            <div className="input-group">
              <label>문의 유형</label>
              <select name="type" value={formData.type} onChange={handleChange}>
                <option value="브랜드 웹사이트 및 커머스 구축">브랜드 웹사이트 및 커머스 구축</option>
                <option value="고성능 프론트엔드 / UI·UX 고도화">고성능 프론트엔드 / UI·UX 고도화</option>
                <option value="운영 지원 및 유지보수 관리">운영 지원 및 유지보수 관리</option>
                <option value="기타 비즈니스 협업">기타 비즈니스 협업</option>
              </select>
            </div>

            <div className="input-group">
              <label>의뢰 내용</label>
              <textarea name="message" value={formData.message} onChange={handleChange} required placeholder="구상 중이신 프로젝트에 대해 자유롭게 적어주세요." rows="6"></textarea>
            </div>

            <div className="agreement-group">
              <input type="checkbox" id="agreement" name="agreement" checked={formData.agreement} onChange={handleChange} required />
              <label htmlFor="agreement">개인정보 수집 및 이용에 동의합니다.</label>
            </div>

            <button type="submit" className={`submit-btn ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
              {isLoading ? <div className="spinner"></div> : '의뢰하기'}
            </button>
          </form>

          {/* 깔끔하게 분리된 Map 컴포넌트 호출 */}
          <div className="contact-info-side">
            <Map />
            <div className="contact-details-text">
               <p><strong>주소:</strong> 인천 부평구 시장로 33 한남시티프라자 7층</p>
               <p><strong>이메일:</strong> idkwane@naver.com</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Contact;