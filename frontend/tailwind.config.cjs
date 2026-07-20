module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#14B8A6',   // Medical Teal (Standardized)
        secondary: '#0D9488', // Darker Teal for depth
        background: '#F8FAFC',
        surface: '#FFFFFF',
        textDark: '#1E293B',
        textLight: '#64748B',
        success: '#22C55E',
        error: '#EF4444'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Poppins', 'sans-serif']
      }
    }
  },
  plugins: []
}
