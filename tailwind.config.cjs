/** @type {import('tailwindcss').Config} */
// LOOPER — design system, compiled to static CSS through PostCSS (NOT the
// runtime CDN). The theme.extend below carries the Material-3-derived color
// tokens, the Inter / IBM Plex Mono font families, the editorial type scale
// (headline-lg…label-caps), the 4px spacing unit + container/gutter/margin
// tokens, and the sharp 0.25rem-default border radius.
//
// fontFamily entries list the display font first, then fall through to the
// CSS-var stack globals.css also exposes (--font-inter / --font-plex-mono) and
// finally a system fallback, so the `font-headline-*` / `font-body-*` /
// `font-data-mono` utilities resolve correctly however the fonts are loaded.
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        "on-secondary-fixed": "#00210f",
        "on-background": "#101a24",
        secondary: "#0a3d6e",
        "surface-variant": "#dde6f0",
        "on-tertiary-fixed-variant": "#6e3900",
        "on-secondary-fixed-variant": "#00522e",
        "surface-dim": "#d3deeb",
        primary: "#117ACA",
        "on-primary-container": "#858388",
        "primary-fixed-dim": "#c8c5cb",
        "secondary-container": "#cfe4f7",
        "tertiary-fixed-dim": "#ffb77d",
        "primary-fixed": "#e4e1e7",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#0a3d6e",
        "on-tertiary": "#ffffff",
        "on-primary": "#ffffff",
        "tertiary-container": "#2f1500",
        surface: "#f5f9fd",
        "surface-container": "#e6eef7",
        background: "#f5f9fd",
        "on-tertiary-container": "#c76c00",
        "surface-container-high": "#dde8f4",
        "primary-container": "#0a3d6e",
        "on-error": "#ffffff",
        "inverse-on-surface": "#eaf1f9",
        "surface-container-low": "#eef4fb",
        outline: "#7d92a8",
        "surface-bright": "#f5f9fd",
        error: "#ba1a1a",
        "surface-tint": "#117ACA",
        "inverse-primary": "#9dc7ea",
        "on-surface-variant": "#435465",
        "surface-container-lowest": "#ffffff",
        "on-tertiary-fixed": "#2f1500",
        "on-primary-fixed-variant": "#47464b",
        "tertiary-fixed": "#ffdcc3",
        "on-primary-fixed": "#1b1b1f",
        "outline-variant": "#c2d2e2",
        tertiary: "#000000",
        "secondary-fixed-dim": "#89d7a4",
        "on-surface": "#101a24",
        "on-error-container": "#93000a",
        "inverse-surface": "#1c2c3c",
        "surface-container-highest": "#dde6f0",
        "error-container": "#ffdad6",
        "secondary-fixed": "#a4f4be",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      spacing: {
        "container-max": "1440px",
        gutter: "16px",
        margin: "24px",
        unit: "4px",
      },
      fontFamily: {
        "headline-lg": ["Inter", "var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        "headline-md": ["Inter", "var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        "headline-sm": ["Inter", "var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        "body-lg": ["IBM Plex Mono", "var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        "body-md": ["IBM Plex Mono", "var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        "data-mono": ["IBM Plex Mono", "var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        "label-caps": ["IBM Plex Mono", "var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "headline-lg": ["32px", { lineHeight: "1.1", letterSpacing: "-0.04em", fontWeight: "800" }],
        "headline-md": ["24px", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "800" }],
        "headline-sm": ["18px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "body-lg": ["16px", { lineHeight: "1.5", letterSpacing: "0em", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "1.5", letterSpacing: "0em", fontWeight: "400" }],
        "data-mono": ["13px", { lineHeight: "1", letterSpacing: "0em", fontWeight: "500" }],
        "label-caps": ["12px", { lineHeight: "1", letterSpacing: "0.1em", fontWeight: "600" }],
      },
    },
  },
  plugins: [],
};
