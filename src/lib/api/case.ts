/* eslint-disable no-console */
import Parse from '@/lib/parse';
import { Item, App, AppInstallation, WorkspaceScheme, Workspace, Repository } from '../models';
/* import { IQLBuilder } from '@/lib/utils/iql';
import { hasArrayItem } from '@/lib/utils/helper';
import fetch from '@/lib/utils/fetch'; */

export interface ICommonRes<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export const getAppByAppKey = (key: string): Promise<any> => {
  const query = new Parse.Query(App);
  //可以放两个equalTo，加一层条件
  //通过pointer比较的时候，要拿到createId，将pointer值拿出来
  query.equalTo('key', key);
  return query.find();
};

export const getAppInstallationByApp = (id: string): Promise<any> => {
  //思路：我们拿到了application，取到这些appInstallation的scheme
  const app = App.createWithoutData(id);
  const query = new Parse.Query(AppInstallation);
  query.equalTo('app', app);
  return query.find();
};

export const getAppInstallationByAppIds = (ids: string[]): Promise<any> => {
  if (ids.length == 0) return;
  const query = new Parse.Query(AppInstallation);
  query.containedIn('app', ids);
  return query.find();
};

//get workspace by scheme
export const getWorkspacesByScheme = (id: string): Promise<any> => {
  const sheme = WorkspaceScheme.createWithoutData(id);
  const query = new Parse.Query(Workspace);
  query.equalTo('workspaceScheme', sheme);
  return query.find();
};

//获取所有workspaces
export const getWorkspacesBySchemeIds = (shemesIds: string[]): Promise<any> => {
  //todo,处理schemes相关的书
  if (shemesIds.length == 0) return;
  const query = new Parse.Query(Workspace);
  query.containedIn('workspaceScheme', shemesIds);
  return query.find();
};

//get repo by key
export const getRepoByKey = (key: string): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const query = new Parse.Query(Repository);
    query.equalTo('workspaceKey', key);
    query
      .find()
      .then(res => {
        resolve({
          success: true,
          data: res,
          message: 'success',
        });
      })
      .catch(err => {
        reject({
          success: false,
          data: err,
          message: 'error',
        });
      });
  });
};

//get items by repo
export const getRepoById = (id: string): Promise<ICommonRes> => {
  const query = new Parse.Query(Repository);
  query.equalTo('objectId', id);
  return query.find();
};
export const getItemById = (id: string): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const query = new Parse.Query(Item);
    query.equalTo('objectId', id);
    query
      .find()
      .then(res => {
        resolve({
          success: true,
          data: res,
          message: 'success',
        });
      })
      .catch(err => {
        reject({
          success: false,
          data: err,
          message: 'error',
        });
      });
  });
};
