import { Item } from './App';
import { TestType } from '@/lib/constants';

// 测试实体
type BaseTestEntity = {
  objectId: string;
  /** 测试用例类型 */
  type: TestType;
  /** 空间标识 */
  workspaceKey: string;
  /** 测试实体关联事项 */
  reference: Item;
  /** 测试用例最新执行状态 */
  status: Status['key'];
  /** 测试执行关联测试用例实体 */
  runReferenceDetail: TestEntity<TestType.TestDetail>;
  /** 额外数据 */
  extra: Record<string, unknown>;
  /** 测试用例数据 */
  detail?: {
    steps: Step[];
    precondition: string;
  };
  /** 测试执行数据 */
  runDetail: {
    steps: Step[];
    precondition: string;
    defectItemIds?: string[];
    attachments?: Attachment[]; // 附件
  };
  /** 测试用例评论数据 */
  comments: comment[];

  executor: any[]; // 执行人信息
  createdBy: any;
  updatedBy: any;
};

/** 测试实体类型 */
export type TestEntity<TTestType extends TestType = TestType.TestDetail> =
  TTestType extends TestType.TestDetail
    ? Omit<BaseTestEntity, 'runDetail' | 'runReferenceDetail'>
    : TTestType extends TestType.TestRun
    ? Omit<BaseTestEntity, 'reference' | 'detail'>
    : TTestType extends TestType.TestPlan
    ? Omit<BaseTestEntity, 'status' | 'detail' | 'runDetail' | 'runReferenceDetail'>
    : BaseTestEntity;

/** 测试用例状态 */
export type Status = {
  color: string;
  description: string;
  name: string;
  key: string;
  final: boolean;
  native: boolean;
  readOnly: boolean;
  type: 'TODO' | 'PASSED' | 'EXECUTING' | 'FAILED';
};

/** 步骤表单 */
export type StepField = Record<'key' | 'value', any>;

// 附件
export type Attachment = {
  url: string; // 文件地址
  status: string; // 上传状态
  name: string;
  size: number;
  uid: string;
  time?: string; // 上传时间
  [key: string]: any;
};

export type Step = {
  id: string; // uuid

  data?: string; // 数据

  action?: string; // 步骤描述
  result?: string; // 预期结果

  // 改字段区分是否是测试继承类型
  callTestId?: string; // 测试继承（test entity id）

  // 以下字段在测试执行形成
  defectItemIds?: string[]; // 缺陷关联
  status?: Status['key']; // 步骤状态
  actualResult?: string; // 实际结果
  comment?: string; // 评论

  // 以下字段为保留字段暂时不用
  attachments?: string[]; // 附件
  customFields?: StepField[]; // 自定义字段
};

export type comment = {
  id: string; // 评论 ID
  value: any; // 评论内容
  createTime: string; // 评论时间
  createUserId: string; // 评论用户 id
};
