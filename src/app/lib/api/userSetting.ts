import { UserSetting, Workspace } from '../models';

export const getCurrentUserSetting = async ({
  workspaceKey,
  user,
}: {
  workspaceKey?: string;
  user?: PointerType;
}) => {
  const workspace = new Parse.Query(Workspace).equalTo('key', workspaceKey).first();

  const userSettingData = await new Parse.Query(UserSetting)
    .equalTo('workspace', workspace)
    .equalTo('user', user)
    .first();

  return userSettingData?.toJSON();
};

export const saveUserSetting = async ({
  objectId,
  workspaceKey,
  filterFields,
  user,
}: {
  objectId?: string;
  filterFields?: any;
  workspaceKey: string;
  user: PointerType;
}) => {
  const workspace = new Parse.Query(Workspace).equalTo('key', workspaceKey).first();

  const userSetting = new UserSetting({
    objectId,
    filterFields,
    user,
    workspace,
  });

  return await userSetting.save();
};
