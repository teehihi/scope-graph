import React, { useState, useEffect } from 'react';
import { useRouter } from '../router';
import { useAuth } from '../context/AuthContext';

const DESKTOP_FRAMES = [
  '/brand/404_frame/0.png',
  '/brand/404_frame/1.png',
  '/brand/404_frame/2.png',
  '/brand/404_frame/3.png',
];

const MOBILE_FRAMES = [
  '/brand/404_frame/mascot_only_new/0.png',
  '/brand/404_frame/mascot_only_new/1.png',
  '/brand/404_frame/mascot_only_new/2.png',
  '/brand/404_frame/mascot_only_new/3.png',
];

// Thời gian chuẩn theo nguyên lý hoạt họa 2D (Keyframe & In-between):
// - Frame 0: Giữ pose đọc bản đồ bình tĩnh (1.5s)
// - Frame 1: In-between chuyển tiếp nâng tay (180ms)
// - Frame 2: Giữ pose giật mình toát mồ hôi khi nhận ra lạc đường (1.4s)
// - Frame 3: In-between chuyển tiếp hạ tay quay lại kiểm tra (180ms)
const FRAME_DURATIONS = [1500, 180, 1400, 180];

export const NotFound: React.FC = () => {
  const { navigate } = useRouter();
  const { isAuthenticated } = useAuth();
  const [frameIndex, setFrameIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Preload toàn bộ frames vào bộ nhớ trình duyệt
  useEffect(() => {
    [...DESKTOP_FRAMES, ...MOBILE_FRAMES].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Vòng lặp animation chuyển frame theo đúng nhịp
  useEffect(() => {
    const currentDuration = FRAME_DURATIONS[frameIndex];
    const timer = setTimeout(() => {
      setFrameIndex((prev) => (prev + 1) % 4);
    }, currentDuration);

    return () => clearTimeout(timer);
  }, [frameIndex]);

  // Nhận diện thiết bị mobile / desktop
  useEffect(() => {
    const checkMobile = () => {
      const isNarrow = window.innerWidth < 640;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsMobile(isNarrow || isMobileUA);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleBack = () => {
    if (isAuthenticated) {
      navigate('/app/dashboard');
    } else {
      navigate('/');
    }
  };

  const currentFrames = isMobile ? MOBILE_FRAMES : DESKTOP_FRAMES;

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#151923] flex flex-col items-center justify-center p-6 text-center font-sans selection:bg-[#C7F36B] selection:text-[#151923]">
      <div className="max-w-lg w-full space-y-6">
        {/* Frame Animation: Chuyển frame dứt khoát không có opacity dissolve để không bị chá/lóa màu */}
        <div className="relative mx-auto w-full flex items-center justify-center min-h-[190px] sm:min-h-[240px]">
          {currentFrames.map((src, idx) => (
            <img
              key={src + idx}
              src={src}
              alt="Lost in the graph"
              className={`absolute inset-0 m-auto max-h-full object-contain select-none pointer-events-none ${
                idx === frameIndex ? 'opacity-100 z-10 visible' : 'opacity-0 z-0 invisible'
              } ${isMobile ? 'w-48 h-auto' : 'w-full max-w-md h-auto'}`}
            />
          ))}
          {/* Spacer vô hình giữ đúng chiều cao & responsive ratio, không bị giật layout */}
          <img
            src={currentFrames[0]}
            alt=""
            aria-hidden="true"
            className={`invisible pointer-events-none select-none ${
              isMobile ? 'w-48 h-auto' : 'w-full max-w-md h-auto'
            }`}
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#151923] tracking-tight">
            Lost in the graph?
          </h1>
          <p className="text-sm sm:text-base text-[#8B929E] max-w-md mx-auto leading-relaxed">
            This path doesn’t lead anywhere. Let’s find your way back.
          </p>
        </div>

        <div>
          <button
            onClick={handleBack}
            className="group inline-flex items-center justify-center gap-2.5 text-xs font-bold px-6 py-3 rounded-xl bg-[#151923] text-[#F7F8F5] hover:bg-[#C7F36B] hover:text-[#151923] hover:shadow-lg hover:shadow-[#C7F36B]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
          >
            <span>Back to dashboard</span>
            <span className="text-[#C7F36B] group-hover:text-[#151923] group-hover:translate-x-1 transition-all duration-200 font-bold text-sm">
              →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
