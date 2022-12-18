import { iqlRequest } from '../../../lib/iqlRequest';
import { TestType } from '../../../../common/constant';

const { list = [], workspaceKey } = global?.body ?? {};

const queryTestEntity = async props => {
  const { offset, limit, ascending, query = {}, selector, descending } = props;
  return iqlRequest({
    query,
    selector,
    ascending,
    descending,
    pagination: { limit, offset },
  });
};

export const generateSortIndex = async () => {
  if (!workspaceKey) return;
  const { type, targetSortIndex, isUpDrag } = getSortType(list?.[0] ?? {});
  const selector = `'test_manager_sortIndex' ${type} '${targetSortIndex}'`;
  const {
    data: {
      list: [data],
    },
  } = await queryTestEntity({
    query: {
      type: TestType.Case,
      workspaceKey,
    },
    fields: ['id', 'name', 'r_test_manager_sortIndex'],
    limit: 1,
    selector,
    ...(isUpDrag
      ? { ascending: ['sortIndex', 'createdAt'] }
      : { descending: ['sortIndex', 'createdAt'] }),
  });

  const sortIndex = data?.sortIndex
    ? Math.floor((data?.sortIndex - targetSortIndex) / 2) + targetSortIndex
    : isUpDrag
    ? targetSortIndex - 10e5
    : targetSortIndex + 10e5;

  return {
    case: data,
    sortIndex,
  };
};

const getSortType = ({ source, target }) => {
  const sourceIndex = source?.index;
  const targetIndex = target?.index;

  if (sourceIndex > targetIndex) {
    return {
      isUpDrag: sourceIndex > targetIndex,
      type: '>',
      targetSortIndex: target.sortIndex,
    };
  }

  return {
    isUpDrag: sourceIndex > targetIndex,
    type: '<',
    targetSortIndex: target.sortIndex,
  };
};
