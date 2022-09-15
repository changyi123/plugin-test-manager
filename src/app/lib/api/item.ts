import fetch from '@/lib/utils/fetch';
import { QueryLinkedTestEntityPayload, QueryTestEntityPayload } from 'common/types/api';

export const getTestEntityByQuery = async (props: QueryTestEntityPayload) => {
  const _props = Object.assign({}, props, {
    descending: ['createdAt'],
  });

  const {
    data: { data },
  } = await fetch.post('/api/app/osc/test_manager/webhooks/api-query-test-entity', _props);

  return {
    list: data.list ?? [],
    total: data.total ?? [],
  };
};

export const getlinkedTestEntityByQuery = async (props: QueryLinkedTestEntityPayload) => {
  const {
    data: { data },
  } = await fetch.post('/api/app/osc/test_manager/webhooks/api-query-linked-test-entity', props);

  return {
    list: data.list ?? [],
    total: data.total ?? 0,
  };
};

export const deleteTestEntity = async ids => {
  const res = await fetch.post('/api/app/osc/test_manager/webhooks/api-delete-test-entity', {
    ids,
  });

  return res;
};
