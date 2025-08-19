import { IScreenLabelProps } from './types';

/**
 * 获取字段width样式
 */
export const getFieldWidthStyle = (
  labelWidth: number,
  labelAlign: IScreenLabelProps,
  hiddenLabel: boolean,
  apply: string,
): any => {
  // 字段不是应用在表格
  // 字段algin模式不是上对齐
  if (hiddenLabel) {
    // 字段隐藏后，也需100%展示
    labelWidth = 0;
  }
  if (apply !== 'cell' && labelAlign !== 'top') {
    return { width: `calc(100% - ${labelWidth}px)` };
  }
  return { width: '100%' };
};
