import i18next from 'i18next';
import React, { createContext, useEffect, useRef, useState } from 'react';
import { initReactI18next } from 'react-i18next';

import locales from '../../../../locales';
import { getAppEnv } from '../appEnv';

const resources = Object.entries(locales).reduce((resource, [lng, translation]) => {
  resource[lng] = {
    translation,
  };
  return resource;
}, {});

i18next.use(initReactI18next).init({
  fallbackLng: 'zh',
  debug: false,
  resources,
});

export const i18n = i18next;

export const defaultLanguage = 'zh';
export const I18nContext = createContext<i18nContext>(null);

type LocalLng = string;
type LngDict = any;

type i18nContext = {
  locale: LocalLng;
  t: typeof i18n.t;
  setLocale: (l: LocalLng, dict?: LngDict) => void;
};

type I18nProvider = (params: {
  children: React.ReactNode;
  locale: LocalLng;
  lngDict: LngDict;
}) => JSX.Element;

const wrapI18nT = ((...props: Parameters<typeof i18n.t>) => {
  const text = i18n.t.call(i18n, ...props);
  const repositoryAlias = getAppEnv('alias')?.repository;
  if (repositoryAlias) {
    if (typeof text === 'string') {
      return text.replace(/模块/g, repositoryAlias) || text;
    }
    if (typeof text === 'object') {
      const _newText: Record<string, string> = {};
      Object.keys(text).forEach(_key => {
        const key = _key.replace(/模块/g, repositoryAlias) || _key;
        _newText[key] = text[_key].replace?.(/模块/g, repositoryAlias) || text[_key];
      });
      return _newText;
    }
    return text;
  }
  return text;
}) as typeof i18n.t;

const I18n: I18nProvider = ({ children, locale, lngDict }) => {
  const activeLocaleRef = useRef(locale || defaultLanguage);
  const [, setTick] = useState(0);
  const firstRender = useRef(true);

  const i18nWrapper: i18nContext = {
    locale: activeLocaleRef.current,
    t: wrapI18nT,
    setLocale: l => {
      i18n.changeLanguage(l);
      activeLocaleRef.current = l;
      // force rerender to update view
      setTick(tick => tick + 1);
    },
  };

  // for initial SSR render
  if (locale && firstRender.current === true) {
    firstRender.current = false;
    i18nWrapper.setLocale(locale, lngDict);
  }

  useEffect(() => {
    if (locale) {
      i18nWrapper.setLocale(locale, lngDict);
    }
    // only when locale/lngDict is updated
    // eslint-disable-next-line
  }, [lngDict, locale]);

  return <I18nContext.Provider value={i18nWrapper}> {children} </I18nContext.Provider>;
};

export default I18n;
