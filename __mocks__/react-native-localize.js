/**
 * Jest manual mock for react-native-localize (ADR-044). The real package
 * reads native OS locale settings, unavailable under Jest. Tests that care
 * about a specific device locale should `jest.mock` this module themselves
 * with a more specific implementation; this default keeps every other test
 * deterministic (English/US, matching this mock's own fixed default).
 */
function getLocales() {
  return [{ languageCode: 'en', countryCode: 'US', languageTag: 'en-US', isRTL: false }];
}

function findBestLanguageTag(languageTags) {
  const locales = getLocales();
  for (const locale of locales) {
    if (languageTags.includes(locale.languageTag)) {
      return { languageTag: locale.languageTag, isRTL: locale.isRTL };
    }
  }
  return undefined;
}

module.exports = {
  getLocales,
  findBestLanguageTag,
  getCountry: () => 'US',
  getCurrencies: () => ['USD'],
  getTemperatureUnit: () => 'fahrenheit',
  getTimeZone: () => 'America/New_York',
  uses24HourClock: () => false,
  usesMetricSystem: () => false,
  usesAutoDateAndTime: () => true,
  usesAutoTimeZone: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};
