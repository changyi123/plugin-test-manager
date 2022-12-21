import { getParseQuery, saveAllObject } from '@giteeteam/apps-team-api';
import { TestType } from '../../../common/constant';

const ParseBaseQueryOptions = {
  sessionToken: global.sessionToken,
};

// 拖拽排序旧数据处理
export const handleSortIndexScript = async () => {
  const itemQuery = await getParseQuery(false, 'Item');

  const dateNowSortIndex = Math.floor(Date.now() / 1000) * 10e5;
  const itemList = await itemQuery
    .equalTo('values.r_test_manager_type', TestType.Case)
    .lessThanOrEqualTo('values.r_test_manager_sortIndex', dateNowSortIndex)
    .findAll(ParseBaseQueryOptions);

  const handleSortIndex = item => {
    const values = item.get('values');
    if (!values.r_test_manager_sortIndex) return;
    const oldSortIndex = values.r_test_manager_sortIndex / 10e5;
    const [num1, num2] = String(oldSortIndex ?? 0)?.split('.');
    if (Number(num2 ?? '') > 1000) {
      return null;
    }
    return Number(num1) * 10e5 + Number(num2 ?? '') * 1000;
  };

  const needUpdateItems = itemList
    .map(item => {
      const sortIndex = handleSortIndex(item);
      if (!sortIndex) return null;
      item.set('values', {
        ...(item.get('values') ?? {}),
        r_test_manager_sortIndex: sortIndex,
      });
      return item;
    })
    .filter(Boolean);

  const updatedItems = await saveAllObject(needUpdateItems);
  console.info('updatedItems', updatedItems);
  return {
    data: updatedItems.map(d => d.get('values').r_test_manager_sortIndex),
  };
};
