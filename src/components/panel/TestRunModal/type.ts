import { TestType } from '@/lib/constants';
import { TestEntity } from '@/lib/types/Test';

export type TabsComponentBaseProps = {
  testRunData: TestEntity<TestType.TestRun>;
  testRunEntity: Parse.Object<TabsComponentBaseProps['testRunData']>;
  refTestDetailData: TestEntity<TestType.TestDetail>;
  onDataChange?: () => void;
};
