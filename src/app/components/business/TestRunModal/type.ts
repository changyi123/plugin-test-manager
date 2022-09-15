import { TestType } from '@/lib/constants';
import { TestEntity } from '@/lib/types/Test';
import { Item, ItemLink } from '@/lib/types/App';

export type TabsComponentBaseProps = {
  testRunData: TestEntity<TestType.Run>;
  testRunEntity: Parse.Object<TabsComponentBaseProps['testRunData']>;
  refTestDetailData: TestEntity<TestType.Case>;
  allRelationDefects: { type: 'global' | 'step'; itemId: string; stepId?: string; item: Item }[];
  itemLinks: ItemLink[];
  onDataChange: () => void;
  onLoading: (loading?: boolean) => void;
  handleStatusChangeBySteps?: (status) => void;
  selectedTestPlanId?: string;
};
