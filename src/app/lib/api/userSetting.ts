import { UserSetting, Workspace } from '../../services/models';

export const getCurrentUserSetting = async ({
  workspaceKey,
  user,
}: {
  workspaceKey?: string;
  user?: PointerType;
}) => {
  if (!workspaceKey) return null;
  const workspace = await new Parse.Query(Workspace).equalTo('key', workspaceKey).first();

  if (!user) {
    user = await Parse.User.current();
  }

  const userSettingData = await new Parse.Query(UserSetting)
    .equalTo('workspace', workspace)
    .equalTo('user', user)
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
  user: PointerType;
}) => {
  const workspace = await new Parse.Query(Workspace).equalTo('key', workspaceKey).first();

  if (!user) {
    user = await Parse.User.current();
  }

  const userSettingData = await new Parse.Query(UserSetting)
    .equalTo('workspace', workspace)
    .equalTo('user', user)
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
