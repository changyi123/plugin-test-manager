import { UserSetting, Workspace } from '../../services/models';

export const getCurrentUserSetting = async ({
  workspaceKey,
  user,
}: {
  workspaceKey?: string;
  user?: Parse.Pointer;
}) => {
  if (!workspaceKey) return null;
  const workspace = await new Parse.Query(Workspace).equalTo('key', workspaceKey).first();

  user = user || window.QiankunProps?.context?.currentUser;
  const userSettingData = await new Parse.Query(UserSetting)
    .equalTo('workspace', workspace)
    .equalTo('user', Parse.User.createWithoutData(user.objectId).toPointer())
    .first();

  return userSettingData?.toJSON();
};

export const saveUserSetting = async ({
  workspaceKey,
  filterFields,
  testType,
  user,
}: {
  filterFields?: {
    testPlan?: string[];
    testCase?: string[];
  };
  testType?: string;
  workspaceKey: string;
  user?: Parse.Pointer;
}) => {
  const workspace = await new Parse.Query(Workspace).equalTo('key', workspaceKey).first();

  user = user || window.QiankunProps?.context?.currentUser;

  const userSettingData = await new Parse.Query(UserSetting)
    .equalTo('workspace', workspace)
    .equalTo('user', Parse.User.createWithoutData(user.objectId).toPointer())
    .first();

  if (userSettingData) {
    const data = userSettingData.toJSON();
    filterFields = {
      ...(data?.filterFields ?? {}),
      [testType]: filterFields?.[testType],
    };

    return await userSettingData.save({
      filterFields,
    });
  }

  const userSetting = new UserSetting({
    filterFields,
    user,
    workspace,
  });

  return await userSetting.save();
};
