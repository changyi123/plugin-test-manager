export interface FieldData {
  objectId: string;
  property: Property;
  data: Data;
}

export interface FieldConfigProp {
  fieldData: FieldData;
  mutate: () => Promise<void>;
}

export type Record<T> = {
  [key in keyof T]: T[key];
};

export type Property = Partial<Record<DepartmentProperty>>;

export type Data = Partial<Record<DepartmentData>>;

// 注意点这里的类型和field项目里面的类型可能会有不同，这里会精简以及修改propertyName
export interface CellProp {
  itemId: string; // customFieldId
  labelAlign: string;
  labelWidth: number;
  hiddenLabel: boolean;
  text: string;
  options: Option[];
  objectId: string;
  workspaceId: string;
}

export interface FieldProp {
  objectId: string; // customFieldId
  fieldTypeKey?: string;
  page: string;
  value: string | string[];
  label: string;
  labelAlign: string;
  labelWidth: number;
  hiddenLabel: boolean;
  placeholder: string;
  options: Option[];
  readonly: boolean;
  itemValues: ItemValues;
  itemId: string;
  name: string;
  onChange: (v: any, o?: any) => void;
  mode?: string;
  // 自动化参数类型  标识是否需要手动处理参数
  isHandle: boolean;
  customData?: CustomData[];
  display?: string;
  customFieldsMap?: {
    [propName.string]: any;
  };
  fieldConfiguration: any;
  editMode: boolean;
  screenMode: string;
  workspace?: string;
}

type CustomData = {
  label: string;
  value: string;
};
