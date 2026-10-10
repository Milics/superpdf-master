import React, { useId } from 'react';

interface PdfMasterLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

export function PdfMasterLogo({ className = 'w-9 h-9', size, ...props }: PdfMasterLogoProps) {
  const id = useId().replace(/:/g, '');

  return (
    <svg
      viewBox="10 0 52 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      {...props}
    >
      <defs>
        {/* 主干渐变：活力珊瑚红 -> 电光紫 -> 科技蓝 */}
        <linearGradient id={`${id}-stem`} x1="12" y1="12" x2="24" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF4B72" />
          <stop offset="45%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>

        {/* 环部渐变 */}
        <linearGradient id={`${id}-loop`} x1="22" y1="12" x2="48" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF5A5F" />
          <stop offset="50%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>

        {/* 右上折页背光渐变 (Dog-Ear Fold) */}
        <linearGradient id={`${id}-fold`} x1="34" y1="12" x2="48" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFB4C4" />
          <stop offset="100%" stopColor="#D8B4FE" />
        </linearGradient>

        {/* 大师星芒暖金渐变 */}
        <linearGradient id={`${id}-sparkle`} x1="42" y1="2" x2="60" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF066" />
          <stop offset="50%" stopColor="#FFB300" />
          <stop offset="100%" stopColor="#FF6F00" />
        </linearGradient>

        {/* 星芒柔和微光 */}
        <filter id={`${id}-glow`} x="38" y="-2" width="26" height="26" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 左侧主立柱 */}
      <path
        d="M13 18C13 14.6863 15.6863 12 19 12H24V41L15 51C13.8 52.2 13 51.5 13 50V18Z"
        fill={`url(#${id}-stem)`}
      />

      {/* 右侧环部（纯镂空复合几何路径，无任何硬编码背景遮挡） */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M24 12H35C41.6274 12 47 17.3726 47 24C47 30.6274 41.6274 36 35 36H24V12ZM24 20.5H33.5C35.433 20.5 37 22.067 37 24C37 25.933 35.433 27.5 33.5 27.5H24V20.5Z"
        fill={`url(#${id}-loop)`}
      />

      {/* 右上角翻折层 (立体折纸质感) */}
      <path
        d="M35 12L47 24H38C36.3431 24 35 22.6569 35 21V12Z"
        fill={`url(#${id}-fold)`}
      />

      {/* 层次交接阴影 */}
      <path
        d="M24 36V28H28C31 28 34 32 30 36H24Z"
        fill="#1E1B4B"
        opacity="0.15"
      />

      {/* 大师灵感星芒 (右上角悬浮闪耀) */}
      <g filter={`url(#${id}-glow)`}>
        <path
          d="M51 2C51 7.2 46.8 10 42 10C46.8 10 51 12.8 51 18C51 12.8 55.2 10 60 10C55.2 10 51 7.2 51 2Z"
          fill={`url(#${id}-sparkle)`}
        />
        <circle cx="51" cy="10" r="1.3" fill="#FFFFFF" />
      </g>
    </svg>
  );
}
