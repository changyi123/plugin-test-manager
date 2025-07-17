import { GroupConfig } from 'components/common/search-select/types';
import { VALUE_OF_SCREEN_TYPE, VALUEOF_FIELD_CONTAINERS_PAGE } from 'lib/global';

import type { EditViewBaseProps } from '../types';

export type IScreenLabelProps = 'left' | 'right' | 'top';

export interface CellProps {
  overlayClsName?: string;
  workspaceId?: string;
}
interface RegularProps {
  message?: string;
  expression?: string;
}
export interface FieldProps extends EditViewBaseProps {
  screenMode?: VALUE_OF_SCREEN_TYPE;
  editMode?: boolean;
  name?: string;
  page?: VALUEOF_FIELD_CONTAINERS_PAGE; // 从哪里使用的字段
  labelAlign?: IScreenLabelProps; // 标签对齐方式
  labelWidth?: number; // 标签宽度
  hiddenLabel?: boolean;
  readonly?: boolean;
  apply?: string;
  validation?: RegularProps;
  userData?: Record<string, any>;
  searchComponent?: boolean;
  allowNull?: boolean;
  isGroup?: boolean;
  groupConfig?: GroupConfig;
  onGroupFetch?: (key: string) => FilterGroupType;
  children?: React.ReactNode;
  itemId?: string;
}

export interface CommonProps {
  overlayClsName?: string;
  required?: boolean;
  label?: string;
  description?: string;
  searchComponent?: boolean;
  screenMode?: VALUE_OF_SCREEN_TYPE;
}

interface CustomDataProps {
  data: any;
  id: string;
  screenType?: string;
  locked?: boolean;
  refreshData?: () => void;
}
