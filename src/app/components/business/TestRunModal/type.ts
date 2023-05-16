import { TestType } from '@/lib/constants';
import { Item, ItemLink } from '@/lib/types/App';
import { TestEntity } from '@/lib/types/Test';

export type TabsComponentBaseProps = {
  testRunData: TestEntity<TestType.Run>;
  testRunEntity: TestEntity<TestType.Run>;
  refTestDetailData: TestEntity<TestType.Case>;
  allRelationDefects: { type: 'global' | 'step'; itemId: string; stepId?: string; item: Item }[];
  itemLinks: ItemLink[];
  onDataChange: () => void;
  onLoading: (loading?: boolean) => void;
  handleStatusChangeBySteps?: (status, isStep?: boolean) => void;
  selectedTestPlanId?: string;
};
