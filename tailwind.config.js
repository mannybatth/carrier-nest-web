// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
    content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter var', ...defaultTheme.fontFamily.sans],
            },
        },
        animation: {
            enter: 'enter 200ms ease-out',
            'slide-in': 'slide-in 1.2s cubic-bezier(.41,.73,.51,1.02)',
            leave: 'leave 150ms ease-in forwards',
        },
        keyframes: {
            enter: {
                '0%': { transform: 'scale(0.9)', opacity: 0 },
                '100%': { transform: 'scale(1)', opacity: 1 },
            },
            leave: {
                '0%': { transform: 'scale(1)', opacity: 1 },
                '100%': { transform: 'scale(0.9)', opacity: 0 },
            },
            'slide-in': {
                '0%': { transform: 'translateY(-100%)' },
                '100%': { transform: 'translateY(0)' },
            },
        },
    },
    plugins: [require('@tailwindcss/line-clamp'), require('@tailwindcss/forms')],
};
