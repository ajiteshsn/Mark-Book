/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // McMaster heritage palette (brand.mcmaster.ca)
                mac: {
                    maroon: '#7A003C',
                    'maroon-dark': '#5C002D',
                    'maroon-light': '#F5E6EE',
                    gold: '#FDBF57',
                    'gold-light': '#FFF4DE',
                    grey: '#495965',
                },
            },
        },
    },
    plugins: [],
}
