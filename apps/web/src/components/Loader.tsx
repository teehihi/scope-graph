import React from 'react';

interface LoaderProps {
  color?: string;
  size?: number;
}

export const Loader: React.FC<LoaderProps> = ({ color = '#151923', size = 64 }) => {
  return (
    <div className="flex items-center justify-center">
      <style>{`
        .custom-auth-loader {
          --loader-color: ${color};
          --loader-size: ${size}px;
          width: var(--loader-size);
          height: calc(var(--loader-size) * 0.7);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 5px;
        }

        .custom-auth-loader span {
          width: 100%;
          height: 100%;
          background-color: var(--loader-color);
          border-radius: 4px;
          animation: keyframes-blink 0.6s alternate infinite linear;
        }

        .custom-auth-loader span:nth-child(1) {
          animation-delay: 0ms;
        }

        .custom-auth-loader span:nth-child(2) {
          animation-delay: 200ms;
        }

        .custom-auth-loader span:nth-child(3) {
          animation-delay: 300ms;
        }

        .custom-auth-loader span:nth-child(4) {
          animation-delay: 400ms;
        }

        .custom-auth-loader span:nth-child(5) {
          animation-delay: 500ms;
        }

        .custom-auth-loader span:nth-child(6) {
          animation-delay: 600ms;
        }

        @keyframes keyframes-blink {
          0% {
            opacity: 0.3;
            transform: scale(0.5) rotate(5deg);
          }

          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      <div className="custom-auth-loader">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
};

export default Loader;
