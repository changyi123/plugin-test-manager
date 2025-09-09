import { TestType } from '@/lib/constants';
import { TestEntity } from '@/lib/types/Test';

export type TestPlanEntity = TestEntity<TestType.Plan>;

export type TestExecutionEntity = TestEntity<TestType.Execution>;
