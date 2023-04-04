import React from 'react';
import useI18n from '@/lib/hooks/useI18n';
import { StepComponentProp } from '../type';
import { useRequest, useBoolean } from 'ahooks';
import { getPriorityOptions } from '@/lib/api/minder';
import { Upload, Checkbox, Button, message } from 'antd';
import { parseXMindFile2MinderData, countMinderNodes, exportAndDownloadXMind } from '@/lib/minder';

import cx from './XMindUpload.less';
import { MinderNodeType } from 'common/constant';

const { Dragger } = Upload;

const getXMindTemplateNodes = t => {
  return {
    root: {
      data: {
        text: '用例导入',
      },
      children: [
        {
          data: {
            type: MinderNodeType.Module,
            text: '模块1',
          },
          children: [
            {
              data: {
                type: MinderNodeType.TestCase,
                text: '测试用例1',
                priority: 'P1',
              },
              children: [
                {
                  data: {
                    type: MinderNodeType.Precondition,
                    text: '前置条件',
                  },
                },
                {
                  data: {
                    type: MinderNodeType.Step,
                    text: '步骤1',
                  },
                  children: [
                    {
                      data: {
                        type: MinderNodeType.Result,
                        text: '预期结果1',
                      },
                    },
                  ],
                },
                {
                  data: {
                    type: MinderNodeType.Step,
                    text: '步骤2',
                  },
                  children: [
                    {
                      data: {
                        type: MinderNodeType.Result,
                        text: '预期结果2',
                      },
                      children: [
                        {
                          data: {
                            type: MinderNodeType.Data,
                            text: '数据',
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              data: {
                type: MinderNodeType.TestCase,
                text: '测试用例2',
                priority: 'P0',
              },
              children: [
                {
                  data: {
                    type: MinderNodeType.Step,
                    text: '步骤1',
                  },
                },
                {
                  data: {
                    type: MinderNodeType.Step,
                    text: '步骤2',
                  },
                },
              ],
            },
          ],
        },
        {
          data: {
            type: MinderNodeType.Module,
            text: '模块2',
          },
          children: [
            {
              data: {
                type: MinderNodeType.TestCase,
                text: '测试用例',
                priority: 'P1',
              },
            },
          ],
        },
      ],
    },
  };
};

const XMindUpload: React.FC<StepComponentProp> = ({ onSharedStateChange }) => {
  const { t } = useI18n();
  const [isIncludeRootNode, { toggle: toggleIsIncludeRootNode }] = useBoolean(false);

  const { runAsync } = useRequest(
    async () => {
      const options = await getPriorityOptions();
      return options;
    },
    {
      staleTime: -1,
    },
  );

  const handleParseXMindFile = async options => {
    const { file, onProgress, onSuccess, onError } = options;
    onProgress({ percent: 30 });
    const priorityOptions = await runAsync();
    const minderData = await parseXMindFile2MinderData(file, {
      priorityOptions,
    });

    const testCaseNodeCount = countMinderNodes(minderData, MinderNodeType.TestCase);
    if (testCaseNodeCount > 1000) {
      message.error(t('page.xMindImport.uploadStep.countLimitTip'));
      return onError({}, t('page.xMindImport.uploadStep.countLimitTip'));
    }

    // TODO: 是否导入根节点

    // 更新下一个
    onSharedStateChange({ minderData, canGoNext: true });
    setTimeout(onSuccess, 500);
  };

  return (
    <div className={cx('container')}>
      <div className={cx('location')}>
        <strong>{t('page.xMindImport.uploadStep.importLocation')}</strong>
        <span></span>
      </div>
      <Dragger maxCount={1} accept=".xmind, x-xmind" customRequest={handleParseXMindFile}>
        <p className="ant-upload-drag-icon"></p>
        <p className="ant-upload-text">{t('page.xMindImport.uploadStep.uploader.text')}</p>
        <p className="ant-upload-hint">{t('page.xMindImport.uploadStep.uploader.hint')}</p>
      </Dragger>
      <div className={cx('tips-container')}>
        <p className={'tip'}>
          <strong>{t('page.xMindImport.uploadStep.importTips')}</strong>
        </p>
        <ul>
          <li>
            {t('page.xMindImport.uploadStep.includeRootTip')}
            <div>
              <Checkbox
                className={cx('checkbox')}
                checked={isIncludeRootNode}
                onChange={() => toggleIsIncludeRootNode()}
              />
              <span
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => toggleIsIncludeRootNode()}
              >
                {t('page.xMindImport.uploadStep.importIncludeRoot')}
              </span>
            </div>
          </li>
          <li>
            {t('page.xMindImport.uploadStep.typeTip')}
            <a className={cx('example-link')}>{t('page.xMindImport.uploadStep.typeExample')}</a>
          </li>
          <li>{t('page.xMindImport.uploadStep.levelTip')}</li>
          <li>{t('page.xMindImport.uploadStep.countLimitTip')}</li>
        </ul>
      </div>
      <Button onClick={() => exportAndDownloadXMind(getXMindTemplateNodes(t), { t })}>
        {t('page.xMindImport.uploadStep.downloadTemplate')}
      </Button>
    </div>
  );
};

export default XMindUpload;
