/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 使用CSS变量的RGB格式，支持alpha
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          '2': 'rgb(var(--surface2) / <alpha-value>)',
        },
        border: 'rgb(var(--border) / <alpha-value>)',
        txt: {
          DEFAULT: 'rgb(var(--text) / <alpha-value>)',
          '2': 'rgb(var(--text2) / <alpha-value>)',
          muted: 'rgb(var(--muted) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          hover: 'rgb(var(--primary-hover) / <alpha-value>)',
          50: '#EEF2FF',
          100: '#E0E7FF',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        honor: 'rgb(var(--honor) / <alpha-value>)',
        accent: {
          cyan: 'rgb(var(--accent-cyan) / <alpha-value>)',
          violet: 'rgb(var(--accent-violet) / <alpha-value>)',
          400: '#A78BFA',
          500: '#8B5CF6',
        },
        // dark颜色系 - 雾蓝紫值(非白/灰/黑)
        dark: {
          50: '#EEF2FF',       // 雾蓝紫背景
          100: '#E0E7FF',      // 浅紫hover背景
          200: '#C7D2FE',      // 边框色
          300: '#A5B4FC',      // 次要边框
          400: '#3E56A0',      // muted文字
          500: '#26387A',      // 次要文字
          600: '#1E3A8A',      // 深蓝文字
          700: '#EEF2FF',      // 浅色(用于背景)
          800: '#F0EDFF',      // 淡紫纸感
          900: '#12204E',      // 主文字色(深靛蓝墨)
          950: '#0E1236',      // 最深色(dark模式背景)
        },
      },
      fontFamily: {
        sans: ['Noto Sans SC', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Noto Sans SC', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradient 8s ease infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'mesh-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glass-lg': '0 25px 50px -12px rgba(31, 38, 135, 0.25)',
        'neon': '0 0 5px theme(colors.primary.400), 0 0 20px theme(colors.primary.600)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}
