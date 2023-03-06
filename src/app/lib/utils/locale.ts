import resource from '../../../../locales';
import zh from 'antd/lib/locale/zh_CN';
import en from 'antd/lib/locale/en_US';

import { get } from 'lodash';
import languageParser from 'accept-language-parser';

// 默认支持三种语言
const AcceptLanguageList = ['zh', 'en', 'ru'];

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

export function getLang(defaultLang = 'en'): string {
  let lang = defaultLang;
  const QiankunPropsLocal = window.QiankunProps?.context?.env?.LOCALES;
  const storageLangValue = localStorage.getItem('lang');

  try {
    if (QiankunPropsLocal) {
      lang = QiankunPropsLocal;
    } else if (process.env.NODE_ENV === 'production' && window.__POWERED_BY_QIANKUN__) {
      lang = languageParser.pick(
        AcceptLanguageList,
        get(window.QiankunProps?.Parse?.CoreManager?.get('REQUEST_HEADERS'), 'Accept-Language'),
      );
    } else if (storageLangValue) {
      lang =
        typeof storageLangValue === 'string' && storageLangValue.startsWith('"')
          ? JSON.parse(storageLangValue)
          : storageLangValue;
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
