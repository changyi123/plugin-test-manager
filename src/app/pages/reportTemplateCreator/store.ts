import { atom } from 'jotai';

import type { TestReportModelType } from '@/services/testReport/model';

import { LocationStoreHashKey } from './lib';

const testReportAtom = atom({} as TestReportModelType);
export const stageAtom = atom<'default' | 'create'>('default');

export const testReportWitchConnectWithLocationAtom = atom(
  get => get(testReportAtom),
  (get, set, data: any) => {
    set(testReportAtom, data);

    // 追加 testReportId 到 search 中
    const urlParams = new URLSearchParams(window.location.search);
    if (data.objectId && !urlParams.has(LocationStoreHashKey)) {
      set(stageAtom, 'create');
      urlParams.append(LocationStoreHashKey, data.objectId);
      const newUrl = `${location.href}?${urlParams.toString()}`;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }
  },
);
