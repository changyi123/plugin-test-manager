import { TestExecution } from '../models';
import Parse from '@/lib/parse';

interface PostAddTestExecutionReq {
  action: string;
  data: string;
  result: string;
  resource: string;
}

interface ICommonRes {
  success: boolean;
  msg?: string;
  data?: any;
}

export const PostAddTestExecution = (req: PostAddTestExecutionReq): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const query = new TestExecution();
    query.save(req).then(
      res => {
        resolve({
          success: true,
          data: { ...res },
        });
      },
      err => {
        reject({
          success: false,
          data: { ...err },
          msg: err,
        });
      },
    );
  });
};

export const fetchTestExecution = (resource: string): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const query = new Parse.Query(TestExecution);
    query.equalTo('resource', resource);
    query.find().then(
      res => {
        resolve({
          success: true,
          data: res.map(item => {
            const obj = item.toJSON();
            obj.id = obj.objectId;
            obj.isExpand = true;
            return obj;
          }),
        });
      },
      err => {
        reject({
          success: false,
          data: { ...err },
          msg: err,
        });
      },
    );
  });
};

export const deleteTestExecution = (id: string): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    TestExecution.createWithoutData(id)
      .destroy()
      .then(
        () => {
          resolve({
            success: true,
          });
        },
        err => {
          reject({
            success: false,
            msg: err,
          });
        },
      );
  });
};
