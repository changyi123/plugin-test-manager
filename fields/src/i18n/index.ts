import { Language, LANGUAGE_MAP } from './constants';
import { Key } from './types';

const LANGUAGE = 'lang'; // 设置源为产品 one 中 个人信息设置页的逻辑
export const storageLanguage: Language =
  (window as any).globalState?.userInfo?.language ||
  (window as any).env?.LOCALES ||
  localStorage.getItem(LANGUAGE);
let currentLanguage: Language;
if (storageLanguage && Object.values(Language).includes(storageLanguage)) {
  currentLanguage = storageLanguage;
} else {
  currentLanguage = Language.CHINESE;
}

const { translation: currentTranslation } = LANGUAGE_MAP[currentLanguage];

/**
 * 翻译
 */
const t = (key: Key) => {
  if (process.env.NODE_ENV !== 'production') {
    if (!(key in currentTranslation)) {
      console.error(`请移除缺少翻译<key:${key}>的调用`);
    }
  }
  return currentTranslation[key];
};

const firstCharToUpperCase = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export { currentLanguage, firstCharToUpperCase, Language, LANGUAGE_MAP, t };
