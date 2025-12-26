import React from 'react';
import '../style/button.scss';

const Button = ({ text, onClick }) => {
  return (
    <button className="cta-button" onClick={onClick}>
      <span className="button-text">{text}</span>
      <div className="button-icon">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M5 12h14"></path>
          <path d="m12 5 7 7-7 7"></path>
        </svg>
      </div>
    </button>
  );
};

export default Button;