import enGB from 'antd/es/locale/en_GB';
import zhCN from 'antd/es/locale/zh_CN';

import enTranslation from './en';
import { Key } from './types';
import zhTranslation from './zh';

export enum Language {
  CHINESE = 'zh-CN',
  ENGLISH = 'en-US',
  RUSSIAN = 'ru-RU',
  TEAM_CHINESE = 'zh',
  TEAM_ENGLISH = 'en',
  TEAM_RUSSIAN = 'ru',
}

export const ANTD_LANGUAGE_MAP = {
  [Language.CHINESE]: zhCN,
  [Language.ENGLISH]: enGB,
  [Language.RUSSIAN]: enGB,
  [Language.TEAM_CHINESE]: zhCN,
  [Language.TEAM_ENGLISH]: enGB,
  [Language.TEAM_RUSSIAN]: enGB,
};

export function getLanguage(key: string): typeof zhCN | typeof enGB {
  return ANTD_LANGUAGE_MAP[key] || zhCN;
}

export const LANGUAGE_MAP: Record<
  Language,
  {
    name: string;
    region: string;
    translation: { [key in Key]: string };
  }
> = {
  [Language.CHINESE]: {
    name: '中文',
    region: 'Chinese',
    translation: zhTranslation,
  },
  [Language.ENGLISH]: {
    name: 'English',
    region: 'English',
    translation: enTranslation,
  },
  [Language.RUSSIAN]: {
    name: 'Russian',
    region: 'Russian',
    translation: enTranslation,
  },
  [Language.TEAM_CHINESE]: {
    name: '中文',
    region: 'Chinese',
    translation: zhTranslation,
  },
  [Language.TEAM_ENGLISH]: {
    name: 'English',
    region: 'English',
    translation: enTranslation,
  },
  [Language.TEAM_RUSSIAN]: {
    name: 'Russian',
    region: 'Russian',
    translation: enTranslation,
  },
};
