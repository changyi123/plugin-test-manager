// import en from '../../lang/en';
// import zh from '../../lang/zh';
import get from 'lodash/get';

export const getLang = (defaultLang?: string) => {
  return global.headers.lang ?? defaultLang ?? 'zh-CN';
};

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
