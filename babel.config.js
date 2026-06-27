module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4: babel-плагин переехал в react-native-worklets.
    plugins: ['react-native-worklets/plugin'],
  };
};
