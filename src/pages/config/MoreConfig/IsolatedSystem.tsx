import React from 'react';
import { Modal, message } from 'antd';
import { useDataContext } from '../hooks';
import { Switch, Form, List } from 'antd';
import { getRootContainer } from '@/lib/utils/helper';
import { BuiltinItemTypeMapping } from '@/lib/constants';
import { updateGlobalConfig, updateAllTestConfigs } from '@/lib/api/common';
import { getBuiltinItemTypes, updateUsedHierarchySchema } from '@/lib/api/proxima';

const Descriptions = [
  '测试管理插件会在初始化阶段内置测试用例，测试计划，测试执行任务三种类型，请勿删除。若内置三种类型被删除，测试管理系统隔离配置将不能被开启',
  '测试管理系统隔离配置开启后，类型关联配置将不能被修改。测试管理事项关联配置会默认关联测试管理插件内置的三种类型，全部测试空间类型关联配置会被更新为内置的三种类型',
  '测试管理系统隔离配置开启后，测试管理关联的类型创建的事项会被隐藏，事项将不会出现在空间视图中，也无法通过 IQL 中搜索查询',
  '事项管理的视图面板内所有类型下拉选择框无法选择测试管理插件内置的三种类型',
];

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
  const { globalConfig, refreshGlobalConfig } = useDataContext();

  const handleSwitchChange = async checked => {
    if (checked) {
      // 检测内置类型是否还存在
      const builtinItemTypes = await getBuiltinItemTypes();
      if (builtinItemTypes.length < 3) {
        throw message.error('测试管理内置的类型不存在，无法开启此配置');
      }

      await confirmPromisify({
        title: '警告',
        width: 600,
        content: '当前操作会使全部测试空间类型关联配置类型被覆盖！！！',
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
    message.success('测试管理系统隔离操作成功');
  };
  return (
    <div>
      <Form>
        <Form.Item label="开启测试管理系统隔离">
          <Switch
            onChange={handleSwitchChange}
            checked={Boolean(globalConfig?.extra?.isolatedSystem)}
          />
        </Form.Item>
      </Form>
      <List
        size="small"
        header="测试管理系统隔离说明："
        dataSource={Descriptions}
        renderItem={description => {
          const num = Descriptions.indexOf(description) + 1;
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
