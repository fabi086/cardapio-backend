/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'italian-red': 'var(--color-primary)',
                'italian-green': 'var(--color-secondary)',
                'italian-white': '#F4F5F0',
                'gold-accent': '#FFD700',
            },
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
                display: ['Lobster', 'cursive'],
            }
        },
    },
    plugins: [],
}
