import { message, Modal } from 'antd';
import { Form, List, Switch } from 'antd';
import React from 'react';

import { updateAllTestConfigs, updateGlobalConfig } from '@/lib/api/common';
import { getBuiltinItemTypes, updateUsedHierarchySchema } from '@/lib/api/proxima';
import { BuiltinItemTypeMapping } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';
import { getRootContainer } from '@/lib/utils/helper';

import { useDataContext } from '../hooks';

// const Descriptions = [
//   '测试管理插件会在初始化阶段内置测试用例，测试计划，测试执行任务三种类型，请勿删除。若内置三种类型被删除，测试管理系统隔离配置将不能被开启',
//   '测试管理系统隔离配置开启后，类型关联配置将不能被修改。测试管理事项关联配置会默认关联测试管理插件内置的三种类型，全部测试空间类型关联配置会被更新为内置的三种类型',
//   '测试管理系统隔离配置开启后，测试管理关联的类型创建的事项会被隐藏，事项将不会出现在空间视图中，也无法通过 IQL 中搜索查询',
//   '事项管理的视图面板内所有类型下拉选择框无法选择测试管理插件内置的三种类型',
// ];

const confirmPromisify = props => {
  return new Promise((resolve, reject) => {
    Modal.confirm({
      ...props,
      onOk: close => {
        resolve(null);
        close();
      },
      onCancel: close => {
        reject();
        close();
      },
    });
  });
};

const IsolatedSystem = () => {
  const { t } = useI18n();
  const { globalConfig, refreshGlobalConfig } = useDataContext();

  const handleSwitchChange = async checked => {
    if (checked) {
      // 检测内置类型是否还存在
      const builtinItemTypes = await getBuiltinItemTypes();
      if (builtinItemTypes.length < 3) {
        throw message.error(t('page.config.moreConfig.messageError'));
      }

      await confirmPromisify({
        title: t('common.warning'),
        width: 600,
        content: `${t('page.config.moreConfig.warningTips')}！！！`,
        getContainer: getRootContainer,
      });

      await Promise.all([
        updateUsedHierarchySchema(),
        updateAllTestConfigs({ itemTypeMap: BuiltinItemTypeMapping }),
      ]);
    }

    await updateGlobalConfig({
      extra: {
        isolatedSystem: checked,
      },
    });

    await refreshGlobalConfig();
    message.success(t('page.config.moreConfig.messageSuccess'));
  };

  const listDataSource = [
    t('page.config.moreConfig.descriptions.0'),
    t('page.config.moreConfig.descriptions.1'),
    t('page.config.moreConfig.descriptions.2'),
    t('page.config.moreConfig.descriptions.3'),
  ];

  return (
    <div>
      <Form>
        <Form.Item label={t('page.config.moreConfig.enableTestManagerSystemIsolation')}>
          <Switch
            className="test-manger-switch"
            onChange={handleSwitchChange}
            checked={Boolean(globalConfig?.extra?.isolatedSystem)}
          />
        </Form.Item>
      </Form>
      <List
        size="small"
        header={`${t('page.config.moreConfig.systemTips')}：`}
        dataSource={listDataSource}
        renderItem={description => {
          const num = listDataSource.indexOf(description) + 1;
          return (
            <List.Item key={description}>
              <List.Item.Meta description={description} avatar={`${num}.`} />
            </List.Item>
          );
        }}
      ></List>
    </div>
  );
};

export default IsolatedSystem;
