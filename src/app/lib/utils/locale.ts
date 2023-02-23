import resource from '../../../../locales';
import zh from 'antd/lib/locale/zh_CN';
import en from 'antd/lib/locale/en_US';

console.info('en ------------>', en);

export function getMessages(
  locales: string | string[] = ['zh'],
): [locale: string, langBundle: any, antdLang: any] {
  if (!Array.isArray(locales)) {
    locales = [locales];
  }
  let langBundle;
  let antdLang;
  let locale;
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
        antdLang = zh;
        break;
      case 'en-GB':
      case 'en-US':
      case 'en':
        antdLang = en;
        break;
      default:
        break;
    }
  }
  if (!langBundle) {
    return ['en', resource.en || {}, en];
  }
  return [locale, langBundle, antdLang];
}
