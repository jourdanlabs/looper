// PostCSS pipeline for the Next.js build. Tailwind v3 compiles the Stitch theme
// to STATIC CSS here (no runtime CDN — that caused flash-of-unstyled-content),
// autoprefixer adds vendor prefixes. Next.js picks this file up automatically.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
