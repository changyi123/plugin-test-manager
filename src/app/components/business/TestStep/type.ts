import { TestType } from 'common/constant';
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
  callTestEntity: TestEntity<TestType.Case>;
};

export type StepFieldEventProps = {
  onChange?: (value: any) => void;
  /** 继续下一个 */
  onKeyDownEnter?: (value?: any) => void;
};

/** 步骤表单字段 */
export type StepFieldProps = StepField & StepFieldEventProps;
