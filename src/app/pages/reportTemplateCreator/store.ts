import { atom } from 'jotai';

import type { TestReportModelType } from '@/services/testReport/model';

import { LocationStoreHashKey } from './lib';

const reportTemplateAtom = atom({} as TestReportModelType);

export const reportTemplateConnectLocation = atom(
  get => get(reportTemplateAtom),
  (get, set, data: any) => {
    if (data.objectId) {
      if (!location.hash?.includes(LocationStoreHashKey)) {
        location.hash = `#${LocationStoreHashKey}=${data.objectId}`;
      }
      set(reportTemplateAtom, data);
    }
  },
);
