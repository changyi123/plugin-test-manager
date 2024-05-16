import { Key } from './types';

const en: {
  [key in Key]: string;
} = {
  testPlan: 'TestPlan',
  testExecution: 'TestExecution',
  testPlanPlaceholder: 'Please select a test plan',
  testExecutionPlaceholder: 'Please select a test execution',
};

export default en;
