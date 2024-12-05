import { FIELD_TYPE_KEY_MAPPINGS, SYSTEM_FIELD } from 'proxima-sdk/lib/Global';
import { i18n } from 'proxima-sdk/lib/I18n';

export const BASIC_EMITTER_EVENTS = {
  BASIC_GLOBAL_FILTER_SEARCH: 'BASIC_GLOBAL_FILTER_SEARCH', // 基础报表全局筛选事件
};

export const BASIC_TABLE_CHART = 'basic-test-manager-case-statistics';

const commonValue = {
  value: [
    {
      key: 'count',
      fieldType: 'count',
      name: i18n.t('reportPlugin.common.iql.count'),
      compute: 'count',
    },
  ],
  type: BASIC_TABLE_CHART,
  cluster: [
    {
      key: SYSTEM_FIELD.StatusType,
      name: i18n.t('pages.workflow.FormField.statusType'),
      fieldType: FIELD_TYPE_KEY_MAPPINGS.StatusType,
    },
  ],
  grid: {
    w: 3,
    h: 2,
    maxW: 12,
  },
}

// 多维表格默认值
export const BASIC_TABLE_CHART_INIT_VALUE = {
  group: [
    {
      key: SYSTEM_FIELD.ItemType,
      name: i18n.t('reportPlugin.common.iql.itemType'),
      fieldType: FIELD_TYPE_KEY_MAPPINGS.ItemType,
    },
  ],
  ...commonValue,
};

// 多维表格默认值
export const CASE_TABLE_CHART_INIT_VALUE = {
  group: [
    {
      key: 'r_test_manager_repository',
      name: '测试用例模块',
      fieldType: 'r_test_manager_repository_keyword',
    },
  ],
  ...commonValue,
};

export const INIT_OPTION = {
  key: '',
  value: [],
  group: [],
  cluster: [],
  iql: '',
  selectors: {},
};

export const COUNT_OPTION = {
  formula: '',
  target: [],
  unitName: '',
  unit: '',
  precision: 2,
};

export const INIT_ITEM_LIST_OPTION = {
  pageSize: 10,
  columnKeys: [
    SYSTEM_FIELD.Key,
    SYSTEM_FIELD.Status,
    SYSTEM_FIELD.ItemType,
    SYSTEM_FIELD.Workspace,
    SYSTEM_FIELD.ItemGroup,
  ],
};

// 全局x轴下拉框
export const {
  Number,
  User,
  Dropdown,
  ItemType,
  Status,
  Date,
  CreatedAt,
  UpdatedAt,
  Assignee,
  Priority,
  Sprint,
  Version,
  CreatedBy,
  UpdatedBy,
  Workspace,
  StatusType,
  Actors,
  CustomVersion,
  UserGroup,
  RemoteFieldRemoteDataQuote,
  DataQuote,
  Team,
  BindWorkspace,
} = FIELD_TYPE_KEY_MAPPINGS;

export const X_DATA_KEY = [
  Dropdown,
  User,
  ItemType,
  Status,
  Assignee,
  Priority,
  Sprint,
  Version,
  CreatedBy,
  UpdatedBy,
  CreatedAt,
  UpdatedAt,
  Date,
  Workspace,
  StatusType,
  CustomVersion,
  UserGroup,
  RemoteFieldRemoteDataQuote,
  DataQuote,
  Team,
  BindWorkspace,
];
