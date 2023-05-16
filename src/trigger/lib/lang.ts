// import en from '../../lang/en';
// import zh from '../../lang/zh';
import languageParser from 'accept-language-parser';
import get from 'lodash/get';

// 默认支持三种语言
const AcceptLanguageList = ['zh', 'en', 'ru'];

export const getLang = (defaultLang?: string) => {
  return (
    global.headers?.lang ??
    languageParser.pick(AcceptLanguageList, global.headers?.['accept-language']) ??
    defaultLang ??
    'zh'
  );
};

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

export const getLangPkg = (defaultLang?: string) => {
  const lang = getLang(defaultLang);
  console.info('lang------------>', lang);
  // switch (lang) {
  //   case 'zh-CN':
  //   // return zh;
  //   case 'en-US':
  //   default:
  //   // return en;
  // }
};

export const t = key => {
  const langPkg = getLangPkg();
  console.info('langPkg --------------->', langPkg, key);
  return get(langPkg, key);
};
