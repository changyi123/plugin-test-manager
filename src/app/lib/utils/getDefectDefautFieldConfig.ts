import Parse from '@/lib/parse';
import fetch from '@/lib/utils/fetch';
import { GeneralSetting } from '@/services/models';

interface DefectDefaultFieldInfo {
  defaultValues?: {
    [key: string]: Array<string>;
  };
}
/**
 * @description 获取创建缺陷默认值字段以及默认值。
 * */
export const getDefectDefautFieldConfig = async (
  executionId: string,
): Promise<DefectDefaultFieldInfo> => {
  let config = {};
  if (!executionId) {
    return config;
  }
  const _generalConfig = await new Parse.Query(GeneralSetting)
    .select(['objectId', 'defectsDefaultFieldInfo'])
    .first();

  if (_generalConfig) {
    const generalConfigJSON = _generalConfig.toJSON();
    const { defectsDefaultFieldInfo } = generalConfigJSON;
    if (defectsDefaultFieldInfo.defaultValueCustomKey) {
      let finalIql = `子事项 in ['${executionId}']`;
      if (defectsDefaultFieldInfo?.iql) {
        finalIql = defectsDefaultFieldInfo.iql;
      }
      const {
        data: { payload },
      } = await fetch.post('/parse/api/search', {
        iql: finalIql,
        includeHiddenItem: true,
        size: 1,
        fields: ['id'],
      });

      const objectId = payload?.items?.[0]?.objectId;
      if (objectId) {
        config = {
          [defectsDefaultFieldInfo.defaultValueCustomKey]: [objectId],
        };
      }
    }
  }

  return {
    defaultValues: config,
  };
};
