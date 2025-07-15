import { TestType } from '../../../common/constant';

const isUpdate = (item, originalItem) => {
  console.info('item', item, originalItem);
  return true;
};
export const handleBeforeUpdate = async () => {
  const { item, originalItem } = global as any;
  if (originalItem.values.r_test_manager_type !== TestType.Case) return;

  if (!isUpdate(item, originalItem)) return;
  item.values = {
    ...item.values,
    isCaseUpdate: '1',
  };
};
