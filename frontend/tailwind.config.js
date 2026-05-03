export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink:          '#080A0D',
        surface:      'rgba(255,255,255,0.055)',
        line:         'rgba(255,255,255,0.1)',
        gold:         '#C9952A',
        goldLight:    '#E8B84B',
        goldDim:      'rgba(201,149,42,0.18)',
        teal:         '#1D9E75',
        tealLight:    '#22C891',
        textPrimary:  '#F1E8D0',
        textSecondary:'#9A8E7A',
        danger:       '#E24B4A',
        warning:      '#E8A020',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Roboto Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        gold:  '0 0 0 1px rgba(201,149,42,0.3), 0 18px 60px rgba(201,149,42,0.18)',
        glass: '0 2px 0 rgba(255,255,255,0.08) inset, 0 24px 60px rgba(0,0,0,0.5)',
      },
      keyframes: {
        slowSpin: {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        wave: {
          '0%, 100%': { height: '6px',  opacity: '0.4' },
          '50%':      { height: '22px', opacity: '1' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%':      { transform: 'translateY(-8px) rotate(0.4deg)' },
          '66%':      { transform: 'translateY(-4px) rotate(-0.3deg)' },
        },
        goldPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,149,42,0)' },
          '50%':      { boxShadow: '0 0 24px 6px rgba(201,149,42,0.2)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition:  '400px 0' },
        },
      },
      animation: {
        slowSpin:   'slowSpin 6s linear infinite',
        fadeUp:     'fadeUp 450ms ease-out both',
        bob:        'bob 5s ease-in-out infinite',
        goldPulse:  'goldPulse 3s ease-in-out infinite',
        shimmer:    'shimmer 3s ease-in-out infinite',
        wave:       'wave 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
