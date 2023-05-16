import i18n from 'i18next';
import React, { createContext, useEffect, useRef, useState } from 'react';
import { initReactI18next } from 'react-i18next';

import locales from '../../../../locales';

const resources = Object.entries(locales).reduce((resource, [lng, translation]) => {
  resource[lng] = {
    translation,
  };
  return resource;
}, {});

i18n.use(initReactI18next).init({
  fallbackLng: 'zh',
  debug: false,
  resources,
});

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

const I18n: I18nProvider = ({ children, locale, lngDict }) => {
  const activeLocaleRef = useRef(locale || defaultLanguage);
  const [, setTick] = useState(0);
  const firstRender = useRef(true);

  const i18nWrapper: i18nContext = {
    locale: activeLocaleRef.current,
    t: i18n.t,
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
