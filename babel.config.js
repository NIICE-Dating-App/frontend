// babel.config.js (project root)
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // IMPORTANT: reanimated plugin must be last
    plugins: ['react-native-reanimated/plugin'],
  };
};
