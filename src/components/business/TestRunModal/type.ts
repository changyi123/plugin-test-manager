import { TestType } from '@/lib/constants';
import { TestEntity } from '@/lib/types/Test';
import { Item, ItemLink } from '@/lib/types/App';

export type TabsComponentBaseProps = {
  testRunData: TestEntity<TestType.TestRun>;
  testRunEntity: Parse.Object<TabsComponentBaseProps['testRunData']>;
  refTestDetailData: TestEntity<TestType.TestDetail>;
  allRelationDefects: { type: 'global' | 'step'; itemId: string; stepId?: string; item: Item }[];
  itemLinks: ItemLink[];
  onDataChange: () => void;
  onLoading: (loading?: boolean) => void;
  handleStatusChangeBySteps?: (status) => void;
};
