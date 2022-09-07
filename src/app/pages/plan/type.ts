import { TestType } from '@/lib/constants';
import { TestEntity } from '@/lib/types/Test';

export type TestPlanEntity = TestEntity<TestType.TestPlan>;

export type TestExecutionEntity = TestEntity<TestType.TestExecution>;
