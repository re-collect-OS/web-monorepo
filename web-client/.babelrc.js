const presets = [
  [
    "@babel/preset-env",
    {
      modules: false,
    },
  ],
  "@babel/preset-react",
];

const plugins = [
  [
    "@babel/transform-runtime",
    {
      regenerator: true,
    },
  ],
];

// Conditionally load react-hot-loader plugin if not in production environment
if (process.env.NODE_ENV !== "production") {
  plugins.push("react-hot-loader/babel");
}

module.exports = { presets, plugins };
