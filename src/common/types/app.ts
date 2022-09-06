type FieldId = string;
type CustomFieldKey = string;

export type ObjectId = string;
export type ItemKey = string;

// export type DSL = Record<string, unknown>;

export type IQL = string;
export type RouterQuery = Record<string, string | number>;

export interface OptionProps {
  key?: string;
  label: string;
  value: string;
}

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
  parentKey?: string;
  parentValue?: string;
}
export interface BaseParseObject extends Parse.JSONBaseAttributes {
  updatedBy?: User | PointerObject;
  createdBy?: User | PointerObject;
  // 有acl，暂不写
}

export interface PointerObject extends Parse.Pointer {
  __type: 'Pointer';
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
  transitions: any[];
}

export interface WorkflowScheme extends BaseParseObject, SimpleBaseInfo {
  workspaces: { id: string; name: string }[];
  workspaceKeys: string[];
}

export interface Screen extends BaseParseObject, SimpleBaseInfo {
  config?: Record<string, any>;
  layout: Record<string, any>;
  customFieldKeys: CustomFieldKey[];
  validations?: any;
}

export interface ItemTypeScheme extends BaseParseObject, SimpleBaseInfo {
  // 这个字段已经没用了
  // itemTypes: ItemTypes;
  // 目前是undefined
  defaultItemType: any;
  // 数组字符串
  hierarchy: string;
  children: any[];
}

export interface ScreenScheme extends BaseParseObject, SimpleBaseInfo {
  createScreen: Screen;
  defaultScreen: Screen;
  viewScreen: Screen;
  editScreen: Screen;
}

export interface ItemTypeScreenSchemeMapping extends BaseParseObject {
  itemType: ItemType;
  screenScheme: ScreenScheme;
}

export interface ItemTypeScreenScheme extends BaseParseObject, SimpleBaseInfo {
  defaultScreenScheme: ScreenScheme;
  itemTypeScreenSchemeMappings: ItemTypeScreenSchemeMapping[];
}

export interface Workspace extends BaseParseObject, BaseInfo {
  name: string;
  // 这个字段已经没用了
  // itemTypes: ItemTypes;
  // itemTypeScheme: ItemTypeScheme;
  // itemTypeScreenScheme: ItemTypeScreenScheme;
  companyManaged?: boolean;
  lead: User;
  icon: string;
}

export interface Forest {
  rows: string[];
  depths: number[];
}

export interface ItemForest extends BaseParseObject {
  version: number;
  workspace?: Workspace;
  filter?: Filter;
  forest?: Forest;
}

export interface ItemType extends BaseParseObject, BaseInfo {
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
// 字段行为fields
export interface BehaviorConditionProps {
  type: OptionProps;
  value: OptionProps | OptionProps[];
  isEffective: OptionProps;
  valueRelation?: OptionProps[];
}
export interface BehaviorProps {
  conditionList: BehaviorConditionProps[];
  fieldBehavior: string[];
}
export interface BehaviorFieldsProps {
  key: string;
  name: string;
  label: string;
  value: string;
  serviceScript?: string;
  behaviorarray: BehaviorProps;
}
export interface FieldBehavior extends BaseParseObject, SimpleBaseInfo {
  applicationNum: string;
  config: {
    fields: BehaviorFieldsProps[];
    itemType: string[];
    itemTypeObj: { label: string; value: string }[];
  };
}
export interface Group extends BaseParseObject {
  key: string;
  name: string;
  users: User[];
}

type ItemId = ObjectId;
export interface Item extends BaseParseObject {
  name: string;
  key: string;
  ancestors: ItemId[];
  itemType: ItemType | PointerObject;
  ancestorsCount: number;
  subItemCount: number;
  status: Status | PointerObject;
  workspace: Workspace | PointerObject;
  values: Record<string, unknown>;
  board: Board | PointerObject;
  itemGroup: ItemGroup | PointerObject;
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

interface StatusChangeItem {
  name: string;
  type: 'Start' | 'InProgress' | 'Finished';
}

export interface StatusItem {
  __new: StatusChangeItem;
  __old: StatusChangeItem;
}

export interface ItemChange extends BaseParseObject {
  itemUpdatedBy?: User | PointerObject;
  cloneFrom?: ItemChange;
  operation?: 'insert' | 'update' | 'clone';
  content?: Record<FiledKey, any>[];
  item?: Item | PointerObject;
}

export interface ItemLinkType extends BaseParseObject {
  name: string;
  inward?: string;
  outward?: string;
  type?: string; // 类型
  inwardItemType?: string; // 关联方类型
  outwardItemType?: string; // 被关联方类型
  inwardItemTypeMappings?: string[]; // 关联方指定的类型
  outwardItemTypeMappings?: string[]; // 被关联方指定的类型
}

export interface ItemLink extends BaseParseObject {
  source?: Item | PointerObject;
  destination?: Item | PointerObject;
  linkType?: ItemLinkType | PointerObject;
}

export interface ItemTypes extends BaseParseObject {
  key: string;
  name: string;
}

export interface WorkDay extends BaseParseObject {
  values: number[];
}

export interface DateTimeConfiguration extends BaseParseObject {
  values: {
    dateFormat: 'absolute' | 'relative';
  };
}

export interface Holiday extends BaseParseObject {
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
  milestone: {
    itemType?: string;
    startDate?: string;
  };
  otherConfig: {
    autoPatch?: boolean;
  };
}
export interface GanttBaseline extends BaseParseObject {
  name: string;
  view: View | PointerObject;
  description: string;
}

export interface GanttBaselineItemLog extends BaseParseObject {
  item: Item | PointerObject;
  baseline: GanttBaseline | PointerObject;
  content: Record<string, unknown>;
}
export interface ProcessBar extends BaseParseObject {
  percentage: number;
  key: string;
}
type File = { name: string; url: string; __type: string };
export interface Attachment extends BaseParseObject {
  file?: File;
  item?: Item | PointerObject;
}

export interface Board extends BaseParseObject {
  workspace?: Workspace | PointerObject;
  key?: string;
  icon: string;
}

export interface ItemGroup extends BaseParseObject {
  workspace?: Workspace | PointerObject;
  name?: string;
  sort?: number;
}

export interface VersionItem {
  objectId: string;
  name: string;
  status: { name: string; type: string };
}

export interface Version extends BaseParseObject {
  description?: string;
  name?: string;
  workspace?: Workspace | PointerObject;
  startDate?: ParseDate;
  items?: VersionItem[];
  released?: boolean;
  releaseDate?: ParseDate;
  action?: string;
}

export interface Sprint extends BaseParseObject, SimpleBaseInfo {
  workspace?: Workspace | PointerObject;
  startDate?: ParseDate;
  endDate?: ParseDate;
  items?: Item[];
  activated?: boolean;
  completed?: boolean;
  capacity?: number;
}

// 权限类别枚举
export enum CategoryEnum {
  Private = 'private',
  Share = 'share',
}

export interface ViewPermission {
  category: CategoryEnum;
  shareList: { roleType: any; roleId: ObjectId; name?: string }[];
  defaultCategory?: CategoryEnum; // 存放接口返回的类型，如果接口中有数据就不让编辑
}

export interface View extends BaseParseObject, BaseInfo {
  name: string;
  key?: string;
  workspace?: Workspace;
  component: ViewType;
  isDefault: boolean;
  query?: IQL;
  permission?: ViewPermission;
  isShow?: boolean;
}

export interface Board extends BaseParseObject, BaseInfo {
  isFilter: boolean;
  views: PointerObject[]; // view pointer
  lead: Parse.User;
  filter: Filter;
  isDefault: boolean;
}

export interface Role extends BaseParseObject {
  ACL: Parse.CommonAttributes;
  name: string;
  isRoot: boolean;
  target: string | undefined;
  tag: string;
  roles: Role[];
  objectId: string;
  description: string;
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
  board: Board;
  objectId: string;
  role: Role;
  groups?: Group;
  permission: Permission;
}

export interface Priority extends BaseParseObject {
  name: string;
  key: string;
  color: string;
  description?: string;
  order: number;
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
//视图
export type ViewType =
  | 'Default'
  | 'Structure'
  | 'Kanban'
  | 'Gantt'
  | 'StoryMapping'
  | 'Calendar'
  | 'Split';

export type PaginationType = {
  defaultPageSize?: number;
  defaultPageIndex?: number;
  replaceRouterPagination?: (index?: number, size?: number) => void;
};

export type LayoutProps = { complete: boolean };
