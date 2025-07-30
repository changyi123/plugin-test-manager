type FieldId = string;
type CustomFieldKey = string;

export type ObjectId = string;
export type ItemKey = string;

// export type DSL = Record<string, unknown>;

export type IQL = string;
export type RouterQuery = Record<string, string | number | string[]>;

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
  parentId?: string;
  parentValue?: string;
}
export interface BaseParseObject extends Parse.JSONBaseAttributes {
  updatedBy?: User | PointerObject;
  createdBy?: User | PointerObject;
  // 有acl，暂不写
}

export interface PointerObject extends Parse.Pointer {
  key?: string; // 获取弹框初始值的workspace.key报错
  icon?: string;
  __type: 'Pointer';
}

export interface Status extends BaseParseObject, SimpleBaseInfo {
  type: string;
  usageWorkflow: { id: string; name: string }[];
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

export interface Workspace extends BaseParseObject, BaseInfo, WorkspaceScheme {
  // 这个字段已经没用了
  // itemTypes: ItemTypes;
  companyManaged?: boolean;
  lead: User;
  icon: string;
  workspaceTemplate?: WorkspaceTemplate;
  isArchived?: boolean;
  workspace?: any;
  setWorkspaceData?: any;
  permissionScheme: PermissionScheme;
  // [proxima-8937] 接口返回的查询值，查询当前空间有没有启用团队
  hasTeam?: boolean;
}

export interface WorkspacesMap extends WorkspaceInfoRes {
  workspaceMap: {
    objectId?: Workspace;
  };
  updateData: (data) => void;
  setWorkspaceData: (value) => void;
  setWorkspaceConfig: (value) => void;
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
  name?: string;
  key?: string;
  name?: string;
  color?: string;
  icon?: any;
  workflow?: Workflow;
  creatable?: boolean;
  displayConditions?: {
    displayModules?: string[];
    displayContext?: string;
  };
}

export interface SelectCase {
  type?: string;
  fieldType?: string;
  component?: string;
  expression?: string;
  fieldId: FieldId;
  fieldName: string;
  key?: string;
  value?: string | number | any[];
  noToCase?: boolean;
}

export type Selectors = Record<FieldId, SelectCase>;

export interface User extends BaseParseObject {
  username: string;
  avatar?: File;

  emailVerified: boolean;
  email?: string;
  deleted: boolean;
  enabled: boolean;
  nickname?: string;
  isSystem: boolean;
  role?: Record<string, any>;
  value?: ObjectId;
}

export interface WorkspaceType extends BaseParseObject {
  icon?: string;
  name: string;
  description?: string;
  itemTypeScreenScheme?: ItemTypeScreenScheme;
  workflowScheme?: WorkflowScheme;
}

export interface DataSource extends BaseParseObject {
  name: string;
  fieldDataType: string;
}

export interface Style {
  color?: string;
  background?: string;
}
export interface DataSourceOption extends BaseParseObject {
  label: string;
  value: string;
  dataSource: DataSource;
  style?: Style;
  parentId?: string;
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
  assignee: User[];
  ancestors: ItemId[];
  itemType: ItemType | PointerObject;
  ancestorsCount: number;
  subItemCount: number;
  status: Status | PointerObject;
  workspace: Workspace | PointerObject;
  values: Record<string, unknown>;
  board: Board | PointerObject;
  itemLinkTypeId?: ObjectId;
  securityLevel?: string;
  id?: ObjectId;
  hasChildren?: boolean;
  hit?: boolean;
  parentId?: string;
  depth?: number;
  rowId?: ObjectId;
  dataQuotes?: Record<string, unknown>;
  itemSnapshot?: Record<string, unknown>;
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
  workspaces: Workspace[];
  taskId: number;
  actor: { value: string; label: string; userName: string };
};

// 自动化日志表
export type AutomationLog = BaseParseObject & {
  automation?: Automation | PointerObject;
  content?: Automation;
  type?: string;
};

export interface ExecutionLog {
  id: number | string;
  data: string;
  finished: boolean;
  automation: Automation;
  mode: string;
  retryOf?: string;
  retrySuccessId?: number;
  startedAt: string;
  stoppedAt: string;
  workflowData: any;
  workflowName: string;
  tenant: string;
  workflowId: number;
  executionId: string;
  itemChange?: string;
}

// 自动化场景
export type Scenes = BaseParseObject & {
  name: string;
  description: string;
  enabledCount: number;
  disabledCount: number;
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

type FieldKey = string;
export interface FieldType extends BaseParseObject {
  dataType?: string;
  name: string;
  property?: Record<string, unknown>;
  type: string;
  description?: string;
  component: string;
  defaultKey: FieldKey;
  key: FieldKey;
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
  dataSource?: { objectId: string };
}

interface StatusChangeItem {
  name: string;
  type: 'Start' | 'InProgress' | 'Finished';
}

export interface StatusItem {
  __new: StatusChangeItem;
  __old: StatusChangeItem;
}

export interface ItemChangeAutomation {
  name: string;
  id: string;
  type: string;
  executionId?: string;
  actor?: Automation['actor'];
}
export interface ItemChange extends BaseParseObject {
  itemUpdatedBy?: User | PointerObject;
  cloneFrom?: ItemChange;
  operation?:
    | 'insert'
    | 'update'
    | 'clone'
    | 'approval'
    | 'appendUser'
    | 'delegateUser'
    | 'revoke'
    | 'transition';
  content?: Record<FieldKey, any>[];
  item?: Item | PointerObject;
  component?: string;
  from?: ItemChangeAutomation;
  trigger?: ItemChangeAutomation[];
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
  isDefault?: boolean;
  readonly?: boolean;
  inwardIql?: string;
  outwardIql?: string;
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

export enum BoardFilterSource {
  Filter = 'filter',
  IQL = 'iql',
  IN_WORKSPACE = 'inWorkspace',
}

export interface Board extends BaseParseObject {
  iql?: string;
  selectors?: Selectors;
  workspace?: Workspace | PointerObject;
  filter?: Filter | PointerObject;
  key?: string;
  name?: string;
  lead?: User | PointerObject;
  icon: string;
  parent?: ObjectId;
  filterSource?: 'filter' | 'iql' | 'inWorkspace';
  permission?: Array<{ objectId: string; type: 'workspaceRole' | 'group'; name: string }>;
  itemTypeLimit: boolean; // 类型限制 true：不允许新建事项 false：无限制
  itemTypes: ItemType[];
  extend?: Record<string, any>;
  pluginKey?: string; // 插件key
}

export interface VersionItem {
  objectId: string;
  name: string;
  status: { name: string; type: string };
}

export interface ExpandFieldValues {
  [propName: string]: any;
}
export interface Version extends BaseParseObject {
  objectId?: string;
  description?: string;
  name?: string;
  workspace?: Workspace | PointerObject;
  startDate?: ParseDate;
  items?: VersionItem[];
  createdAt?: Date;
  updatedAt?: Date;
  archived?: boolean;
  released?: boolean;
  readOnly?: boolean;
  releaseDate?: ParseDate;
  action?: string;
  expandFieldValues?: ExpandFieldValues;
  status?: string;
}

export interface Sprint extends BaseParseObject, SimpleBaseInfo {
  description?: string;
  name?: string;
  workspace?: Workspace | PointerObject;
  startDate?: ParseDate;
  endDate?: ParseDate;
  items?: Item[];
  createdAt?: string;
  objectId?: string;
  updatedAt?: string;
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
  shareList: { roleType: RoleTypeEnum; roleId: ObjectId; name?: string }[];
  defaultCategory?: CategoryEnum; // 存放接口返回的类型，如果接口中有数据就不让编辑
}

export interface View extends BaseParseObject, BaseInfo {
  name: string;
  key?: string;
  workspace?: Workspace;
  component?: ViewType;
  isDefault?: boolean;
  query?: IQL;
  permission?: ViewPermission;
  isShow?: boolean;
  createdBy?: PointerObject | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  description?: string;
  selectors?: Selectors;
  viewConfiguration?: ViewConfiguration;
  extend?: Record<string, any>;
}

interface iqlResponsePlugin {
  appKey: string;
  environmentKey: string;
  moduleKey: string;
}

export interface Board extends BaseParseObject, BaseInfo {
  isFilter: boolean;
  views: PointerObject[]; // view pointer
  lead: Parse.User;
  filter: Filter;
  isDefault: boolean;
  groupId?: ObjectId;
  iframeUrl?: string;
  extend?: {
    hiddenMoreBoardDropdown?: boolean; // 隐藏导入导出/批量操作按钮
    hiddenCreateItemBtn?: boolean; // 隐藏新建事项按钮
    displayModule?: string; // 显示隐藏事项
    iqlResponsePlugins?: iqlResponsePlugin[]; // 注册插件扩展点
  };
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

export interface ChartGroup extends BaseParseObject {
  objectId: string;
  name: string;
  workspace: Workspace;
  order: number;
  key?: string;
  disabledActions?: string[];
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
  isShowLinkItems?: boolean;
}

export interface ILinkConfigProps {
  itemType: string;
  linkType: string;
  direction?: string;
  errors?: {
    itemTypeError?: string;
    linkTypeError?: string;
    directionError?: string;
  };
}

export interface displayConfigProps {
  linkConfigs?: ILinkConfigProps[];
  linkHierarchy?: number;
}

export interface ViewConfiguration extends BaseParseObject, BaseInfo {
  viewConfiguration: string[];
  config: {
    columns: any[];
    defaultColumns: any[];
  };
  construction?: ConstructionDetail;
  displayConfiguration?: displayConfigProps;
  view?: string;
}

export interface ViewConfigurationProps {
  construction?: ConstructionDetail;
  displayConfiguration?: displayConfigProps; // 关联事项显示配置
}

//视图
export type ViewType =
  | 'Default'
  | 'Structure'
  | 'Kanban'
  | 'Gantt'
  | 'StoryMapping'
  | 'Calendar'
  | 'Split'
  | 'Hierarchy';

export interface WorkspaceRole extends BaseParseObject {
  description?: string;
  name: string;
  type?: string;
  workspace?: string;
  permissionUserInfo?: {
    tag?: string;
    name?: string;
    username?: string;
  };
  // 因为这个接口的返回的是单一权限信息，带有人员信息（人员信息的字段有四种workspaceRole, user, role, group)
  // 需要把相同人员信息的权限进行合并，permissionUserInfo字段就是把不通的人员字段合并成一个，方便渲染
  // permission和permissionList的区别就是一个是单独的权限，一个是每个单独的权限根据相同的人员或角色合并后的权限的集合
  permissionList?: string[];
  permission?: string;
}
export interface PermissionScheme extends BaseParseObject, SimpleBaseInfo {
  roles?: WorkspaceRole[];
}

// 分组类型枚举
export enum BoardGroupType {
  Board = 'board', // 面板类型分组
  Group = 'group', // 普通分组
  Plugin = 'plugin', // 插件
  PluginBoard = 'pluginBoard', // 插件生成的面板
  PluginGroup = 'pluginGroup', // 插件生成的分组
  Component = 'component', // 组件
  Page = 'page', // 页面
}

// 组件数据
export interface Component {
  key: string;
  name: string;
  icon: string;
}

// 面板组
export interface BoardGroup extends BaseParseObject, BaseInfo {
  name: string;
  workspace: Workspace;
  sort: number;
  type: BoardGroupType; // 分组类型
  children: BoardGroup[]; // 子节点
  board?: Board; // 面板类型的分组带关联的面板信息
  plugin?: Plugin; // 插件类型带关联插件的信息
  component?: Component; // 组件类型带关联组件的信息
  parent?: BoardGroup; // 父节点
  pluginKey?: string;
  title?: string;
  componentKey?: string;
}

// 工作流方案配置
export interface WorkflowSchemeConfig extends BaseParseObject, BaseInfo {
  itemType: ItemType;
  workflow: Workflow;
  workflowScheme: WorkflowScheme;
}

// 空间模版
export interface WorkspaceTemplate extends BaseParseObject, BaseInfo, WorkspaceScheme {
  hasItems: boolean;
  boards: Board[];
  views: View[];
  workspace: Workspace;
  cover: string; // 封面图
  type: string;
  backup: string; // 备份封面图
  appKeys?: string[]; // 绑定的应用key
}

export interface ComponentProps extends BaseParseObject {
  name: string;
  icon: string;
  description: string;
  workspaces: Workspace[];
  key: string;
}

export interface WorkspaceInfoRes {
  workspace: WorkspaceTyped;
  boardGroups: BoardGroup[];
  workspaceAuth: WorkspaceAuth;
  itemTypes: ItemType[];
  board?: BoardAttribute;
  components?: ComponentProps[];
  hasTeam?: boolean;
  workspaceNotFound?: boolean;
}
