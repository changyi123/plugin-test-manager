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
    data: { list: nodes },
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

  const [node] = nodes ?? [];
  // 边界顶部后底部情况 sortIndex
  const boundarySortIndex = isUpDrag ? targetSortIndex + 10e5 : targetSortIndex - 10e5;
  const sortIndex = node?.sortIndex
    ? Math.floor((node?.sortIndex - targetSortIndex) / 2) + targetSortIndex
    : boundarySortIndex;

  return {
    case: node,
    sortIndex,
  };
};

const getSortType = ({ source, target }) => {
  const sourceIndex = source?.sortIndex;
  const targetIndex = target?.sortIndex;

  if (sourceIndex > targetIndex) {
    return {
      isUpDrag: false,
      type: '<',
      targetSortIndex: target.sortIndex,
    };
  }

  return {
    isUpDrag: true,
    type: '>',
    targetSortIndex: target.sortIndex,
  };
};
