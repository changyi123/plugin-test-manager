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
