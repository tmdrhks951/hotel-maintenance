import type { Config } from 'tailwindcss';

// ================================================================
// Apple 스타일 디자인 토큰
// 기존 페이지들이 사용하는 유틸리티(gray-*, blue-*, rounded-*, shadow-*)의
// 실제 값을 재정의해, 페이지 코드 수정 없이 전역 리스킨한다.
// ================================================================

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './providers/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Apple 뉴트럴 — 차갑지 않은 회색, 배경은 #F5F5F7
        gray: {
          50: '#F5F5F7',
          100: '#E9E9EE',
          200: '#D9D9E0',
          300: '#B9B9C3',
          400: '#86868B',
          500: '#6E6E73',
          600: '#48484D',
          700: '#363638',
          800: '#252527',
          900: '#1D1D1F',
        },
        // Apple 블루 — 포인트 컬러 (#0071E3 계열)
        blue: {
          50: '#F2F8FF',
          100: '#DFEEFF',
          200: '#BBDDFF',
          300: '#7FC0FF',
          400: '#3D9DFF',
          500: '#0A84FF',
          600: '#0071E3',
          700: '#005BB8',
          800: '#00468F',
          900: '#00366F',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Apple SD Gothic Neo"',
          'Pretendard',
          '"Segoe UI"',
          '"Malgun Gothic"',
          'system-ui',
          'sans-serif',
        ],
      },
      // 연속적인 곡률 느낌 — 한 단계씩 부드럽게
      borderRadius: {
        DEFAULT: '0.5rem',
        md: '0.625rem',
        lg: '0.875rem',
        xl: '1.125rem',
        '2xl': '1.375rem',
        '3xl': '1.75rem',
      },
      // 부드러운 다층 그림자 — 경계 대신 깊이로 구분
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.03)',
        DEFAULT: '0 1px 3px rgba(0,0,0,0.05), 0 4px 14px rgba(0,0,0,0.05)',
        md: '0 2px 6px rgba(0,0,0,0.05), 0 10px 28px rgba(0,0,0,0.07)',
        lg: '0 4px 12px rgba(0,0,0,0.06), 0 18px 44px rgba(0,0,0,0.11)',
        xl: '0 8px 20px rgba(0,0,0,0.08), 0 28px 64px rgba(0,0,0,0.14)',
      },
      transitionTimingFunction: {
        // 감속 위주 — Apple 기본 커브 느낌
        out: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
