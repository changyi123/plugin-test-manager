import dayjs, { Dayjs } from 'dayjs';

export type DateValue = Dayjs | number | string | Date; // 兼容传入的类型为时间戳

// 获取当前日期的当天23点59分59秒时间戳
export const getEndOfDayUnix = (date: DateValue): number => {
  return dayjs(date).endOf('day').valueOf();
};

// 获取当前日期的当天0点0分0秒时间戳
export const getStartOfDayUnix = (date: DateValue): number => {
  return dayjs(date).startOf('day').valueOf();
};

export type DateTimestampRang = [number, number];
