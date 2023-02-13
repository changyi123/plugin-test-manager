import resource from '../../../../locales';

export function getMessages(
  locales: string | string[] = ['zh'],
): [locale: string, langBundle: any, antdLang: any] {
  if (!Array.isArray(locales)) {
    locales = [locales];
  }
  let langBundle;
  let antdLang;
  let locale;
  console.info(1111111111111111, resource[locales[0]]);
  for (let i = 0; i < locales.length && !locale; i++) {
    locale = locales[i];
    const [code = ''] = locale ? locale.split('-') : [];

    langBundle = (resource[locale] ? resource[locale] : resource[code]) || {};

    switch (locale) {
      case 'zh-Hant-HK':
      case 'zh-HK':
      case 'zh-TW':
      case 'zh-Hans-CN':
      case 'zh-CN':
      case 'zh-cn':
      case 'zh':
        antdLang = import('antd/lib/locale/zh_CN');
        break;
      case 'en-GB':
      case 'en':
        antdLang = import('antd/lib/locale/en_US');
        break;
      default:
        break;
    }
  }
  if (!langBundle) {
    return ['en', resource.en || {}, import('antd/lib/locale/en_US')];
  }
  return [locale, langBundle, antdLang];
}
