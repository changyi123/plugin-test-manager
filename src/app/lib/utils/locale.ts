import resource from '../../../../locales';
import { get } from 'lodash';

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

export function getLocales(defaultLang = 'en'): string | string[] {
  let lang = defaultLang;
  const storageLangValue = localStorage.getItem('lang');

  try {
    if (process.env.NODE_ENV === 'production' && window.__POWERED_BY_QIANKUN__) {
      lang = get(
        window.QiankunProps?.Parse?.CoreManager?.get('REQUEST_HEADERS'),
        'Accept-Language',
      );
    } else if (storageLangValue) {
      lang = genAcceptLanguage(
        typeof storageLangValue === 'string' && storageLangValue.startsWith('"')
          ? JSON.parse(storageLangValue)
          : storageLangValue,
      );
    } else if (window.QiankunProps?.context?.env?.LOCALES) {
      lang = genAcceptLanguage(window.QiankunProps.context.env.LOCALES);
    }
  } catch (err) {
    lang = defaultLang;
  }

  return lang;
}

// 获取请求头
export function genAcceptLanguage(lang) {
  switch (lang) {
    case 'zh-CN':
      return 'zh-CN;q=0.9,zh;q=0.8,en;q=0.7';
    case 'zh':
      return 'zh;q=0.8,en;q=0.7';
    case 'ru-RU':
      return 'ru-RU;q=0.9,ru;q=0.8,en;q=0.7';
    case 'ru':
      return 'ru;q=0.8,en;q=0.7';
    case 'en-US':
      return 'en-US,en;q=0.9';
    case 'en':
    default:
      return 'en;q=0.9';
  }
}
