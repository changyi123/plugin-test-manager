import { Form, Input, message } from 'antd';
import { useAtom } from 'jotai';
import { eq } from 'lodash';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { getWorkspaceByKey } from '@/lib/api/proxima';
import { TestReportMaxNameLength } from '@/lib/testReport';
import { testReportMutation } from '@/services/mutation';

import type { ActionRefType } from '../index';
import { testReportWitchConnectWithLocationAtom } from '../store';
import cx from './BasicConfig.less';

const BasicConfig: React.FC<{
  actionRef: React.MutableRefObject<ActionRefType>;
}> = ({ actionRef }) => {
  const { t: scopedT } = useTranslation('', {
    keyPrefix: 'page.reportTemplateCreator.basicConfig',
  });

  const form = Form.useForm()[0];
  const [reportTemplateData, setReportTemplateData] = useAtom(
    testReportWitchConnectWithLocationAtom,
  );

  React.useEffect(() => {
    if (reportTemplateData) {
      form.setFieldsValue({ name: reportTemplateData.name });
    }
  }, [form, reportTemplateData]);

  const { mutateAsync: createTestReport } = testReportMutation.useTestReportCreateMutation();
  const { mutateAsync: updateTestReport } = testReportMutation.useTestReportUpdateMutation();

  React.useImperativeHandle(actionRef, () => ({
    goNextButtonClick: async () => {
      try {
        const data = await form.validateFields();

        // 已存在模板数据，不需要创建，走更新逻辑
        if (reportTemplateData?.objectId) {
          const differentDataValues = Object.keys(data).reduce((values, key) => {
            if (!eq(data[key], reportTemplateData[key])) {
              return {
                ...values,
                [key]: data[key],
              };
            }
            return values;
          }, {});

          if (Object.values(differentDataValues).length !== 0) {
            await updateTestReport({
              objectId: reportTemplateData.objectId,
              ...differentDataValues,
            });
            message.success(scopedT('message.updateReportTemplateSuccess'));
          }

          return;
        }

        // 从 url 中获取对应的 workspaceKey, 并查询 workspaceId
        const workspaceKey =
          new URLSearchParams(window.location.search).get('workspaceKey') ?? null;

        let workspaceId = null;
        if (workspaceKey) {
          const workspace = await getWorkspaceByKey(workspaceKey);
          if (workspace) {
            workspaceId = workspace.objectId;
          }
        }

        const testReportTemplate = await createTestReport({
          workspace: workspaceId,
          isGlobalTemplate: true,
          isDefaultTemplate: false,
          templateConfig: {
            dataSource: {},
          },
          ...data,
        });
        setReportTemplateData(testReportTemplate);

        message.success(scopedT('message.createReportTemplateSuccess'));
        // 创建测试测试报告
      } catch (err) {
        message.error(err?.errorFields[0]?.errors[0]);
        throw err;
      }
    },
  }));

  return (
    <div className={cx('container')}>
      <h3 className={cx('title')}>{scopedT('title')}</h3>
      <Form form={form} className={cx('form')}>
        <div className={cx('name')}>
          <p className={cx('label', 'required')}>{scopedT('form.name.label')}</p>
          <Form.Item
            name="name"
            rules={[{ required: true, message: scopedT('form.name.error') }]}
            noStyle
          >
            <Input
              placeholder={scopedT('form.name.placeholder')}
              maxLength={TestReportMaxNameLength}
            />
          </Form.Item>
        </div>
      </Form>
    </div>
  );
};

export default React.memo(BasicConfig);
