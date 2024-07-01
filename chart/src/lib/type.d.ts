export type ViewProps = {
  charts?: Chart[];
  chartGroupId?: string;
  uid?: string;
  random?: string;
  option?: OptionValue;
  chartOption?: OptionValue;
  view?: string;
  workspace?: Workspace;
  usefulFields?: Parse.Object<CustomField>[];
  sessionToken?: string;
  isListView?: boolean;
  isEdit?: boolean;
  setOption?: React.Dispatch<React.SetStateAction<OptionValue>>;
  setWorkloadChartData?: React.Dispatch<WorkloadDataParams>;
  uid?: string;
  setSearchOption?: React.Dispatch<React.SetStateAction<OptionValue>>;
  timeFrame?: TimeFrameProps;
  setTimeFrame?: React.Dispatch<TimeFrameProps>;
  setEnableSave?: React.Dispatch<boolean>;
  setSelectData?: React.Dispatch<SetDataProps>;
  selectData?: SetDataProps;
  displayContext?: string;
  onRender?: (id: string) => void;
  envContext?: any;
};

interface GlobalIqlFilterCond {
  iql: string;
  selectors: {
    [key: string]: {
      key: string;
      value?: { label: string; value: string }[];
      fieldId: string;
      component: string;
      fieldName: string;
      expression: string | null;
    };
  };
  relatedCharts?: {
    [key: string]: RelatedChart;
  };
  filterName?: string;
  queryType: string;
  disable?: boolean;
}

interface AllGlobalIqlFilterConds {
  [key: string]: GlobalIqlFilterCond;
}

// 列表宽度缓存数据
export interface cacheColumnWidthInterface {
  [fieldKey: string]: number;
}

export type GroupValue = {
  key?: string;
  fieldType?: string;
  name?: string;
  compute?: string;
  sprint?: string;
  startAt?: string;
  endAt?: string;
  interval?: TInterval;
};

export type OptionProps = {
  view?: string;
  option: OptionValue;
  workspace?: Workspace;
  allManifest: PluginManifestChart[];
  usefulFields?: Parse.Object<CustomField>[];
  setOption?: React.Dispatch<any>;
  setSearchOption?: React.Dispatch<any>;
  setAddTarget?: React.Dispatch<any>;
  handleChangeType?: (type: string) => void;
  timeFrame?: TimeFrameProps;
  setSelectData?: React.Dispatch<SetDataProps>;
  selectData?: SetDataProps;
  uid?: string;
};

export type TotalValue = {
  rowTotal?: boolean; // 行总计
  colTotal?: boolean; // 列总计
  rowSubTotal?: boolean; // 行小计
  colSubTotal?: boolean; // 列小计
};

export type FormulaModalProps = {
  visible: boolean;
  onCancel: () => void;
  handleSubmit: (val: Record<string, unknown>) => void;
  formulasName: string[];
  initialValues?: initialFormulaProps;
  isEdit: boolean;
};

import i18next from 'i18next';

import { TInterval } from './ReportConstant';

/**
 * 报表统计的请求报文
 */
export interface ReportLabelRequest {
  value: ReportLabelValue[];
  formula: string;
  precision: number; // 小数点位数
  iqlContext?: Record<string, unknown>;
}

export interface ReportLabelValue extends ReportValue {
  variable: string;
  iql: string;
}

export interface ReportRequestBody {
  name?: string;
  group: ReportGroup[];
  cluster?: ReportCluster[];
  value: ReportValue[];
  total?: ReportTotal;
  iql?: string;
  dsl?: ESdsl;
  orderBy?: ReportOrder;
  iqlContext?: Record<string, unknown>;
  timezone?: string; //时区
  options?: ReportBodyOptions;
}

export interface ReportTotal {
  rowTotal: boolean;
  colTotal: boolean;
  rowSubTotal: boolean;
  colSubTotal: boolean;
}

export interface ReportBody {
  name?: string;
  type: string;
  group?: ReportGroup[];
  cluster?: ReportCluster[];
  value: ReportValue[];
  total?: ReportTotal;
  token?: string;
  options?: ReportBodyOptions;
  formulas?: ReportFormula[];
  i18n?: i18next.i18n;
  from?: number;
  size?: number;
  timezone?: string; //时区
  from?: number;
  size?: number;
}

export interface ReportCluster {
  kind: 'cluster';
  key: string;
  fieldType?: string;
  name?: string;
  fieldFilter?: string[];
  interval?: TInterval;
  size?: number;
  order?: Record<string, 'asc' | 'desc'>;
  children?: ReportCluster[];
}

export interface ReportGroup {
  kind: 'group';
  key: string;
  fieldType?: string;
  name?: string;
  fieldFilter?: string[];
  interval?: TInterval;
  size?: number;
  order?: Record<string, 'asc' | 'desc'>;
  children?: ReportGroup[];
  alias?: string;
  source?: boolean;
}

export type ComputeType = 'count' | 'sum' | 'avg' | 'min' | 'max';
export type FormulaType = 'number' | 'percentage';
export type ESResult = any; // es 查询结果
export type ESResultFormatTmp = any; // 结果整理过程的中间数据
export type ESAggs = any; // es 的 aggs 统计参数
export type ESAggsBucket = Record<string, any>;
export type ESdsl = any; // es 的原生query参数
export type EchartsBody = any; //echart 图表的参数
export type FieldValue = any; // 字段值
export type PluginMethod = 'aggsAdaptor' | 'formater' | 'exporter';
export type ReportBodyOptions = any;

export interface ReportValue {
  kind: 'value';
  key?: string;
  fieldType?: string;
  name?: string;
  compute: ComputeType;
  children?: undefined;
  order?: Record<string, 'asc' | 'desc'>;
  alias?: string;
}

export interface ReportOrder {
  key: string;
  type: 'asc' | 'desc';
}

export interface ReportAdapter {
  aggs: (ReportBody) => ESAggs;
  format: (ReportBody, Record) => Promise<EchartsBody>;
  export: (ReportBody, Record) => Promise<ReportExportResult>;
}

export interface ReportLabelResult {
  map: Map;
  list: string[];
}

export interface ReportExportResult {
  filename: string;
  content: XlsxBody;
}

// xlsx-node 模块生成 excel 文件时的参数
export interface XlsxBody {
  worksheets: any[];
  options?: Record<string, unknown>;
}

// 计算列入参
export interface ReportFormula {
  name: string;
  key?: string;
  formula: string;
  precision?: number;
  type: FormulaType;
}

/** 报表自定义数据源 */
export interface ReportDataSource {
  /** 数据源路径 */
  url: string;
  /** 请求方法，默认为 GET */
  method?: 'GET' | 'POST';
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求参数 */
  payload?: Record<string, unknown>;
}
