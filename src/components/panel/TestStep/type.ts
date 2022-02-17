import { TestType } from '@/lib/constants';
import {
  TestEntity,
  Step as StepDeclaration,
  StepField as StepFieldDeclaration,
} from '@/lib/types/Test';

export type StepField = StepFieldDeclaration & Record<string, any>;

export type StepRow = {
  id: StepDeclaration['id'];
  callTestId: StepDeclaration['callTestId'];
  fields: StepField[];
  callTestEntity: TestEntity<TestType.TestDetail>;
};

export type StepFieldEventProps = {
  onChange?: (value: any) => void;
  /** 继续下一个 */
  onNext?: () => void;
};

/** 步骤表单字段 */
export type StepFieldProps = StepField & StepFieldEventProps;
