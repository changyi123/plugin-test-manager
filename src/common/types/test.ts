import { TestFiledKeyMapping, TestLinkType, TestType } from '../constant';

type ValueOf<T> = T[keyof T];

/** 测试用例字段 Key */
export type TestEntityKey = keyof typeof TestFiledKeyMapping;

/** 事项 values 字段 Key */
export type ItemValuesKey = ValueOf<typeof TestFiledKeyMapping>;

type UserPointerInfo = {
  __type: 'Pointer';
  className: '_User';
  objectId: string;
};

/** 测试基础实体类型 */
export type BaseTestEntity = {
  /** 事项 ObjectId */
  objectId: string;
  /** 事项编号 */
  key: string;
  /** 事项类型 */
  itemType: { objectId: string; name: string; key: string; icon: string };
  /** 测试实体类型 */
  type: TestType;
  /** 测试关联项 */
  linkItems: string[];
  /** 测试管理关联类型 */
  linkType: TestLinkType;
  /** 空间数据 */
  workspace: { objectId: string; name: string; key: string };
  /** 测试用例最新执行状态，改为测试执行状态 */
  status: Status['key'];
  /** 测试用例分组 id */
  repository: string;
  /** 隔离测试计划下测试用例最新状态 */
  caseStatus: Status['caseStatus'];
  /** 隔离测试计划下测试用例最新执行人 */
  caseExecutor: Record<string, unknown>;
  /** 测试执行关联测试用例实体 */
  referenceCase: string;
  /** 额外数据 */
  extra: Record<string, unknown>;
  /** 测试用例，执行排序索引 */
  sortIndex?: number;
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
    attachments?: FileType[]; // 附件
    /** 执行结果描述 */
    executeResultDesc?: Record<string, any>[];
  };
  /** 测试执行评论数据 */
  comments: Comment[];
  /** 最新操作执行人 */
  executor: UserPointerInfo[];
  /** 指派执行人 */
  designee: UserPointerInfo[];
  createdBy: any;
  updatedBy: any;
  executeCount: number;

  /** 事项自定义字段 */
  values: Record<string, any>;
  /** 事项名称 */
  name: string;

  /** 关联查询查询添加字段 */
  source?: string[];

  /** 事项工作流状态 */
  workflowStatus?: { objectId: string; name: string; key: string };
};

type CaseFieldKeys = 'detail' | 'caseStatus' | 'caseExecutor' | 'repository';
type RunFieldKeys =
  | 'comments'
  | 'executor'
  | 'designee'
  | 'runDetail'
  | 'linkedCase'
  | 'status'
  | 'executeCount';

/** 测试实体类型 */
export type TestEntity<TTestType extends TestType = any> = TTestType extends TestType.Case
  ? Omit<BaseTestEntity, RunFieldKeys>
  : TTestType extends TestType.Run
  ? Omit<BaseTestEntity, CaseFieldKeys>
  : TTestType extends TestType.Plan
  ? Omit<BaseTestEntity, CaseFieldKeys | RunFieldKeys>
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
  type: 'TODO' | 'PASSED' | 'EXECUTING' | 'FAILED' | 'BLOCK' | 'CANCEL';
  caseStatus: Record<string, string>;
};

/** 步骤表单 */
export type StepField = Record<'key' | 'value', any>;

// 附件
export type FileType = {
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

  action?: string; // 步骤
  result?: string; // 预期结果

  // 改字段区分是否是测试继承类型
  callTestId?: string; // 测试继承（test entity id）

  // 以下字段在测试执行形成
  defectItemIds?: string[]; // 缺陷关联
  status?: Status['key']; // 步骤状态
  actualResult?: string; // 实际结果
  comment?: Record<string, any>[]; // 评论

  // 以下字段为保留字段暂时不用
  attachments?: string[]; // 附件
  customFields?: StepField[]; // 自定义字段
};

export type Comment = {
  id: string; // 评论 ID
  value: any; // 评论内容
  createTime: string; // 评论时间
  createUserId: string; // 评论用户 id
};
