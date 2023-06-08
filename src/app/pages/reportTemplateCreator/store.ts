import { atom } from 'jotai';

import type { TestReportModelType } from '@/services/testReport/model';

import { LocationStoreHashKey } from './lib';

const reportTemplateAtom = atom({} as TestReportModelType);

export const reportTemplateConnectLocation = atom(
  get => get(reportTemplateAtom),
  (get, set, data: any) => {
    set(reportTemplateAtom, data);

    // 追加 testReportId 到 search 中
    const urlParams = new URLSearchParams(window.location.search);
    if (data.objectId && !urlParams.has(LocationStoreHashKey)) {
      urlParams.append(LocationStoreHashKey, data.objectId);
      const newUrl = `${location.href}?${urlParams.toString()}`;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }
  },
);
