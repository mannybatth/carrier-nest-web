// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
    content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
            },
            fontFamily: {
                sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
                display: ['SF Pro Display', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
                mono: ['SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Consolas', 'monospace'],
            },
            maxWidth: {
                '7xl': '1600px',
            },
            backdropBlur: {
                xs: '2px',
                glass: '12px',
                'glass-lg': '16px',
                'glass-xl': '20px',
                'glass-2xl': '24px',
                'glass-3xl': '32px',
                'glass-ultra': '40px',
            },
            boxShadow: {
                glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                'glass-lg': '0 8px 32px 0 rgba(31, 38, 135, 0.5)',
                'glass-inset': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.5)',
                'glass-border': '0 0 0 1px rgba(255, 255, 255, 0.2)',
                liquid: '0 4px 20px -2px rgba(0, 0, 0, 0.08)',
                'liquid-lg': '0 10px 40px -4px rgba(0, 0, 0, 0.12)',
                'liquid-xl': '0 20px 60px -8px rgba(0, 0, 0, 0.15)',
                'liquid-subtle': '0 2px 8px -1px rgba(0, 0, 0, 0.04)',
            },
            backgroundColor: {
                glass: 'rgba(255, 255, 255, 0.25)',
                'glass-dark': 'rgba(255, 255, 255, 0.1)',
                'glass-light': 'rgba(255, 255, 255, 0.4)',
                liquid: 'rgba(255, 255, 255, 0.95)',
                'liquid-subtle': 'rgba(255, 255, 255, 0.98)',
                'liquid-hover': 'rgba(248, 250, 252, 0.98)',
            },
            borderColor: {
                glass: 'rgba(255, 255, 255, 0.3)',
                'glass-subtle': 'rgba(255, 255, 255, 0.2)',
                liquid: 'rgba(0, 0, 0, 0.06)',
                'liquid-subtle': 'rgba(0, 0, 0, 0.04)',
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
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' },
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' },
                },
                shimmer: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },
                'glass-float': {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-2px)' },
                },
                'glass-pulse': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.8' },
                },
                animation: {
                    'accordion-down': 'accordion-down 0.2s ease-out',
                    'accordion-up': 'accordion-up 0.2s ease-out',
                    shimmer: 'shimmer 2s infinite',
                    'glass-float': 'glass-float 3s ease-in-out infinite',
                    'glass-pulse': 'glass-pulse 2s ease-in-out infinite',
                },
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        function ({ addUtilities }) {
            const glassUtilities = {
                '.glass': {
                    background: 'rgba(255, 255, 255, 0.25)',
                    'backdrop-filter': 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    'box-shadow': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                },
                '.glass-light': {
                    background: 'rgba(255, 255, 255, 0.4)',
                    'backdrop-filter': 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    'box-shadow': '0 8px 32px 0 rgba(31, 38, 135, 0.3)',
                },
                '.glass-dark': {
                    background: 'rgba(255, 255, 255, 0.1)',
                    'backdrop-filter': 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    'box-shadow': '0 8px 32px 0 rgba(31, 38, 135, 0.5)',
                },
                '.glass-card': {
                    background: 'rgba(255, 255, 255, 0.25)',
                    'backdrop-filter': 'blur(12px)',
                    'border-radius': '16px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    'box-shadow': '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.5)',
                },
                '.liquid-popup': {
                    background: 'rgba(255, 255, 255, 0.96)',
                    'backdrop-filter': 'blur(8px) saturate(100%)',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    'box-shadow': '0 20px 60px -8px rgba(0, 0, 0, 0.15)',
                    'border-radius': '20px',
                },
                '.liquid-card': {
                    background: 'rgba(255, 255, 255, 0.98)',
                    'backdrop-filter': 'blur(4px)',
                    border: '1px solid rgba(0, 0, 0, 0.04)',
                    'box-shadow': '0 4px 20px -2px rgba(0, 0, 0, 0.08)',
                    'border-radius': '16px',
                },
                '.liquid-button': {
                    background: 'rgba(255, 255, 255, 0.95)',
                    'backdrop-filter': 'blur(6px)',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    'box-shadow': '0 2px 8px -1px rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.2s ease-out',
                    '&:hover': {
                        background: 'rgba(248, 250, 252, 0.98)',
                        'box-shadow': '0 4px 16px -2px rgba(0, 0, 0, 0.08)',
                        transform: 'translateY(-1px)',
                    },
                },
                '.glass-button': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    'backdrop-filter': 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        background: 'rgba(255, 255, 255, 0.3)',
                        transform: 'translateY(-1px)',
                        'box-shadow': '0 10px 40px 0 rgba(31, 38, 135, 0.4)',
                    },
                },
            };
            addUtilities(glassUtilities);
        },
    ],
};
