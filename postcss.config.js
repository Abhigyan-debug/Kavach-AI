// CommonJS on purpose: Next 14 does not reliably load postcss.config.mjs,
// and a PostCSS config that is silently ignored produces a completely
// unstyled build with no error.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
