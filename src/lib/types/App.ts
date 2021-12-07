type FieldId = string;
type CustomFieldKey = string;

export type ObjectId = string;

// export type DSL = Record<string, unknown>;

export type IQL = string;

export interface SimpleBaseInfo {
  description: string;
  name: string;
}

export interface ParseDate {
  __type: 'Date';
  iso: string;
}

export interface BaseInfo extends SimpleBaseInfo {
  // 用于代替 objectId 做标识用的
  identifier?: string;
  // 用于代替 objectId 做标识用的， 后面都用key
  key?: string;
}
export interface AdvancedConfig {
  id: string;
  label: string;
  value: string;
  parentId?: string;
  parentValue?: string;
}
export interface BaseParseObject extends Parse.JSONBaseAttributes {
  objectId: ObjectId;
  updatedBy?: User | PointerObject;
  createdBy?: User | PointerObject;
  // 有acl，暂不写
}

export interface PointerObject extends Parse.Pointer {
  __type: 'Pointer';
}

export interface Tenant extends BaseParseObject, BaseInfo {
  emailDomain: string;
}

export interface Status extends BaseParseObject, SimpleBaseInfo {
  type: string;
  usageWorkflow: { id: string; name: string }[];
}

export interface Workflow extends BaseParseObject, SimpleBaseInfo {
  step: number;
  nodes: any[];
  usageScheme: { id: string; name: string }[];
  releaseStatus: boolean;
  initial: Status;
}

export interface WorkflowScheme extends BaseParseObject, SimpleBaseInfo {
  workspaces: { id: string; name: string }[];
  workspaceKeys: string[];
}

export interface Screen extends BaseParseObject {
  [key: string]: any;
}

export interface ItemTypeScheme extends BaseParseObject, SimpleBaseInfo {
  // 这个字段已经没用了
  // itemTypes: ItemTypes;
  // 目前 所有 ItemTypeScheme 得 tenant 都 是undefined的
  tenant: Tenant;
  // 目前是undefined
  defaultItemType: any;
  // 数组字符串
  hierarchy: string;
  children: any[];
}

export interface ScreenScheme extends BaseParseObject, SimpleBaseInfo {
  cardOperationInterface: ScreenScheme;
  createScreen: Screen;
  // 目前undefined
  tenant: Tenant;
  defaultScreen: Screen;
  viewScreen: Screen;
  editScreen: Screen;
  cardTypeLevel: ItemTypeScheme;
}
export interface ItemTypeScreenScheme extends BaseParseObject, SimpleBaseInfo {
  // 目前都是undefined的
  tenant: Tenant;
  // 目前是undefined
  defalutScreen: any;
  defaultScreenScheme: ScreenScheme;
  itemTypeScreenSchemeMappings: any[];
}

export interface WorkspaceScheme extends BaseParseObject, SimpleBaseInfo {
  workflowScheme: WorkflowScheme;
  tenant: Tenant;
  itemTypeScheme: ItemTypeScheme;
  itemTypeScreenScheme: ItemTypeScreenScheme;
  cardWorkflow: string;
}

export interface Workspace extends BaseParseObject, BaseInfo {
  name: string;
  tenant: Tenant;
  // 这个字段已经没用了
  // itemTypes: ItemTypes;
  workspaceScheme: WorkspaceScheme;
  // 没有，迁移到了 WorkspaceScheme
  // itemTypeScheme: ItemTypeScheme;
  // itemTypeScreenScheme: ItemTypeScreenScheme;
  companyManaged?: boolean;
  lead: User;
}

export interface Forest {
  rows: string[];
  depths: number[];
}

export interface ItemForest extends BaseParseObject {
  version: number;
  workspace?: Workspace;
  filter?: Filter;
  tenant: Tenant;
  forest?: Forest;
}

export interface ItemType extends BaseParseObject, BaseInfo {
  tenant?: Tenant;
  color?: string;
  icon?: any;
  workflow?: Workflow;
}

export interface SelectCase {
  component: string;
  expression: string;
  fieldId: FieldId;
  fieldName: string;
  key: string;
  value: string | number | any[];
}

export type Selectors = Record<FieldId, SelectCase>;

export interface Filter extends BaseParseObject, SimpleBaseInfo {
  expression: IQL;
  disabled: boolean;
  // dsl?: DSL;
  selectors?: Selectors;
}

export interface User extends BaseParseObject {
  tenant: Tenant | PointerObject;
  username: string;
  avatar?: File;

  emailVerified: boolean;
  email?: string;
  deleted: boolean;
  enabled: boolean;
  nickname?: string;
  isSystem: boolean;
}

export interface WorkspaceType extends BaseParseObject {
  icon?: string;
  name: string;
  description?: string;
  itemTypeScreenScheme?: ItemTypeScreenScheme;
  workflowScheme?: WorkflowScheme;
}
export interface DataSource extends BaseParseObject, SimpleBaseInfo {
  type: DataSourceClassify | PointerObject;
  dataConfig?: { isEdit: boolean; isColor: boolean; isRanked: boolean };
  advancedConfig?: { data: AdvancedConfig[] };
}
export interface DataSourceClassify extends BaseParseObject {
  name: string;
}
export interface FieldBehavior extends BaseParseObject, SimpleBaseInfo {
  applicationNum: string;
  config: {
    fields: any[]; // 数据结构比较复杂
    itemType: string[];
    itemTypeObj: { label: string; value: string }[];
  };
}
export interface Group extends BaseParseObject {
  key: string;
  name: string;
  users: User;
}

type ItemId = ObjectId;
export interface Item extends BaseParseObject {
  key: string;
  name: string;
  ancestors: ItemId[];
  itemType: ItemType | PointerObject;
  ancestorsCount: number;
  subItemCount: number;
  status: Status | PointerObject;
  workspace: Workspace | PointerObject;
  tenant: Tenant | PointerObject;
  values: Record<string, unknown>;
}
export interface Comment extends BaseParseObject {
  parent: Comment | PointerObject;
  item: Item | PointerObject;
  content: string;
}

// 自动化type
export type AutomationNodeType = 'trigger' | 'branch' | 'condition' | 'action';

// 因为接收的可能是任意类型的value，所以修改为any
export type AutomationNodeValue = Record<string, any>;

export type AutomationNode<T = AutomationNodeValue> = {
  name?: string;
  key?: string;
  lineFrom?: string; // 标记从哪个节点连线
  path?: number[];
  type?: AutomationNodeType;
  conditionType?: 'if' | 'else-if' | 'else';
  hide?: boolean;
  description?: string;
  view?: string;
  value?: T;
  children?: AutomationNode[];
};

export type Automation = BaseParseObject & {
  name: string;
  value: AutomationNode[];
  workspace: Workspace;
  taskId: number;
};

// 自动化日志表
export type AutomationLog = BaseParseObject & {
  automation: Automation | PointerObject;
  content: Automation;
  type: string;
};

export interface Kanban extends BaseParseObject {
  name: string;
  swimlaneConfig: {
    strategy: string[] | string;
  };
  workspace: string;
  columns: {
    id: string;
    title: string;
    status: [{ id: string }];
  }[];
  // 筛选器，卡布局配置
  config: Record<string, any>;
}

type FiledKey = string;
export interface FieldType extends BaseParseObject {
  dataType?: string;
  name: string;
  property?: Record<string, unknown>;
  type: string;
  description?: string;
  component: string;
  defaultKey: FiledKey;
  key: FiledKey;
}

interface RegularProps {
  message?: string;
  expression?: string;
}

export interface CustomField extends BaseParseObject {
  readonly?: boolean;
  hidden?: boolean;
  data?: Record<string, unknown>;
  name: string;
  fieldType?: FieldType | PointerObject;
  property: Record<string, unknown>;
  description?: string;
  key: CustomFieldKey;
  required: boolean;
  validation?: RegularProps; // 文本字段的正则校验配置
}
export interface ItemChange extends BaseParseObject {
  itemUpdatedBy?: User | PointerObject;
  operation?: 'insert' | 'update';
  content?: Record<FiledKey, unknown>[];
  item?: Item | PointerObject;
}

export interface ItemLinkType extends BaseParseObject {
  name: string;
  inward?: string;
  outward?: string;
}
export interface ItemLink extends BaseParseObject {
  source?: Item | PointerObject;
  destination?: Item | PointerObject;
  linkType?: ItemLinkType | PointerObject;
}

export interface ItemTypes extends BaseParseObject {
  key: string;
  name: string;
  tenant: Tenant;
}

export interface WorkDay extends BaseParseObject {
  tenant: Tenant;
  values: number[];
}

export interface Holiday extends BaseParseObject {
  tenant: Tenant;
  name: string;
  date: string;
  type: number;
  status: boolean;
}
export interface Gantt extends BaseParseObject {
  time: {
    itemType: string;
    startDate: string;
    endDate: string;
    baseLineStartDate?: string;
    baseLineEndDate?: string;
    percentage?: number;
  }[];
  workspace: string;
  relation: {
    FS: string;
    FF: string;
    SS: string;
    SF: string;
  };
}

export interface ProcessBar extends BaseParseObject {
  tenant?: Tenant;
  percentage: number;
  key: string;
}
type File = { name: string; url: string; __type: string };
export interface Attachment extends BaseParseObject {
  tenant?: Tenant;
  file?: File;
  item?: Item | PointerObject;
}

export interface Role extends BaseParseObject {
  ACL: Parse.CommonAttributes;
  name: string;
  isRoot: boolean;
  target: string | undefined;
  tag: string;
  roles: Role[];
  objectId: string;
}

export interface Permission extends BaseParseObject {
  ACL: Parse.CommonAttributes;
  objectId: string;
  key: string;
  name: string;
  type: string;
  description: string;
}

export interface Privilege extends BaseParseObject {
  workspace: Workspace;
  objectId: string;
  role: Role;
  permission: Permission;
}
export interface ConstructionDetail {
  isShowAncestors?: boolean;
  isShowDescendants?: boolean;
}
export interface ConstructionProps {
  construction?: ConstructionDetail;
  onChange?: (value: ConstructionDetail) => void;
}
export type RoleType = {
  isLead?: boolean;
  permissions?: string[];
  boards?: Record<string, string[]>;
};
