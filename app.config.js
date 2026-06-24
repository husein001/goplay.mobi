// Динамический слой поверх app.json: подставляет секреты из окружения, чтобы не
// держать ключи в репозитории. В EAS задаются через `eas secret` / env профиля.
//
//   GOOGLE_MAPS_API_KEY — ключ Google Maps для Android (карта клубов).
//                         iOS использует Apple Maps и ключ не требует.
//   API_BASE_URL        — переопределить бэкенд (по умолчанию https://goplay.tj).
module.exports = ({ config }) => {
  config.android = config.android || {};
  config.android.config = {
    ...(config.android.config || {}),
    googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY || '' },
  };

  if (process.env.API_BASE_URL) {
    config.extra = { ...(config.extra || {}), apiBaseUrl: process.env.API_BASE_URL };
  }

  return config;
};
