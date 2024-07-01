import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

import { getTenantKey } from './util';

interface FetchInstance extends AxiosInstance {
  $get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;

  $delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;

  $head<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;

  $options<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;

  $post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;

  $put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;

  $patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
}

const tenantKey = getTenantKey();
const currentUserStorageKey = `Parse/${tenantKey}/currentUser`;
const { sessionToken } = JSON.parse(localStorage.getItem(currentUserStorageKey)) ?? {};
// const reg = /sessionToken=([^;]+)/;
// const result = reg.exec(document.cookie);
// const sessionToken = result?.[1];

const config: AxiosRequestConfig = {
  // 5min 超时
  timeout: 300 * 1000,
  headers: {
    'X-Parse-Application-Id': tenantKey,
    'X-Parse-Session-Token': sessionToken,
  },
};

if (process.env.NODE_ENV === 'development') {
  config.baseURL = window.QiankunProps?.context?.env?.PROXIMA_GATEWAY;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const fetch = <FetchInstance>axios.create(config);

fetch.interceptors.response.use(
  (response: AxiosResponse) => {
    // 如果返回的状态码为200，说明接口请求成功，可以正常拿到数据
    // 否则的话抛出错误
    if (response.status >= 200 && response.status < 300) {
      return Promise.resolve(response);
    } else {
      return Promise.reject(response);
    }
  },
  // 服务器状态码不是2开头的的情况
  // 这里可以跟你们的后台开发人员协商好统一的错误状态码
  // 然后根据返回的状态码进行一些操作，例如登录过期提示，错误提示等等
  // 下面列举几个常见的操作，其他需求可自行扩展
  error => {
    // eslint-disable-next-line no-console
    if (error.code === 'ECONNABORTED') {
      console.error('request timeout');
      return Promise.reject('timeout');
    } else if (error.response?.status) {
      if (typeof error.response.data === 'object') {
        console.error(
          error.response.data?.message || error.response.data?.error || 'request failed',
        );
      } else {
        console.error(error.response.data || 'request failed');
      }
      return Promise.reject(error.response);
    }
  },
);

export type Method = 'get' | 'post' | 'delete' | 'put' | 'patch' | 'head' | 'options';

const $fetch = async (method: Method, url: string, ...args: any) => {
  if (!url) {
    return;
  }

  const response = await fetch[method](url, ...args);
  if (response.data) {
    return response.data;
  } else {
    const QiankunProps = (window as any).QiankunProps;
    if (QiankunProps?.context?.currentUser) {
      // TODO 通知弹出提示语
      // console.log(response.data.message);
    } else {
      console.error(response.data.message);
    }
    return Promise.reject(response.data);
  }
};

fetch.$get = async (...args) => $fetch('get', ...args);
fetch.$post = async (...args) => $fetch('post', ...args);
fetch.$delete = async (...args) => $fetch('delete', ...args);
fetch.$put = async (...args) => $fetch('put', ...args);
fetch.$patch = async (...args) => $fetch('patch', ...args);
fetch.$head = async (...args) => $fetch('head', ...args);
fetch.$options = async (...args) => $fetch('options', ...args);

export const fetcherInfiniteList = <T = any, U = any>(query: T): Promise<U[]> => {
  return fetch(query).then(resp => resp.data.payload);
};

export const fetcher = async <T = any>(query: string): Promise<T> => {
  return await fetch.$get(query);
};

export default fetch;
