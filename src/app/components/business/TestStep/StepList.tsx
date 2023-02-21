import React from 'react';
import ReactDOM from 'react-dom';

import _ from 'lodash';
import { useHover } from 'ahooks';
import { Step } from '@/lib/types/Test';
import { StepRow, StepField } from './type';
import { Form, Tooltip, Popconfirm } from 'antd';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { CopyOutlined, DeleteOutlined, DragHandler } from '@/icons';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { getFieldByImpl, StepFieldImpl, BuiltinFieldKeys, getRootContainer } from './helper';
import { useNextStepFieldContext, default as NextStepFieldProvider } from './NextStepFieldProvider';
import { components } from 'proxima-sdk';
import { BaseTestEntity } from 'common/types/test';
import { getItemByIQL } from '@/lib/api/proxima';
import useI18n from '@/lib/hooks/useI18n';

const { ItemIcon } = components.Components.Common;

const REACT_DND_PORTAL_CLASS = 'react-beautiful-dnd-portal';
let RBDPortal = null;

import cx from './StepList.less';

const StepFields: React.FC<{
  stepId: string;
  fields: StepField[];
}> = ({ fields, stepId }) => {
  const { t } = useI18n();
  const fieldsWithImpl = fields?.map(getFieldByImpl, t).filter(Boolean);
  const { saveFieldRef, nextField } = useNextStepFieldContext();

  return (
    <>
      {fieldsWithImpl.map(field => (
        <span key={field.key} className={cx('column', 'field')}>
          <Form.Item name={[stepId, field.key]} noStyle>
            {React.createElement(
              field.component,
              Object.assign(
                {
                  key: field.key,
                  maxLength: 500,
                  placeholder: `${t('components.business.testStep.pleaseInput')}${field.title}（${t(
                    'components.business.testStep.switchNext',
                  )}）`,
                  onKeyDownEnter: () => nextField(stepId, field.key),
                  ref: ref => {
                    // 只有 input 类型组件需要缓存 ref
                    field.type === 'input' && saveFieldRef(stepId, field.key, ref);
                  },
                },
                field,
              ),
            )}
          </Form.Item>
        </span>
      ))}
    </>
  );
};

type StepRowProps = {
  data: StepRow;
  index: number;
  actions: any;
  enableDelete?: boolean;
};

const StepRow: React.FC<StepRowProps> = props => {
  const { t } = useI18n();
  const { data, index, actions, enableDelete } = props;
  const rowRef = React.useRef<HTMLDivElement>();

  const isMouseHover = useHover(rowRef);

  // 步骤表单是否完成
  const isFieldCompleted = data.fields.some(
    field => typeof field.value === 'string' && field.value,
  );

  // 是否为测试继承步骤
  const isCallTestStep = !!data.callTestId;

  // memoized StepFields 渲染，表单字段 render 由 Form.Item 接管
  const StepFieldsMemoKey = data.id + data.fields.map(field => field.key).toString();
  const StepFieldsMemoNode = React.useMemo(
    () => <StepFields stepId={data.id} fields={data.fields} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [StepFieldsMemoKey],
  );

  const CallTestStepNode = React.useMemo(() => {
    const stepLength = _.get(data, 'callTestEntity.detail.steps.length') ?? 0;
    const item = (_.get(data, 'callTestEntity') ?? {}) as BaseTestEntity;
    const itemType = _.get(data, 'callTestEntity.itemType') ?? {};

    return (
      <div className={cx('call-test')}>
        <div>
          <span className={cx('brand')}>{t('components.business.testStep.caseInherit')}</span>
          <ItemIcon className={cx('icon')} icon={itemType.icon}></ItemIcon>
          <span>{item.key}</span>
        </div>
        <div className={cx('content')}>
          <OverflowTooltip className={cx('name')} title={item.name}>
            <span>{item.name}</span>
          </OverflowTooltip>
          <span className={cx('length')}>
            <span className={cx('line')}>|</span>
            {t('components.business.testStep.stepTotal.0')} {stepLength}{' '}
            {t('components.business.testStep.stepTotal.1')}
          </span>
        </div>
      </div>
    );
  }, [data, t]);

  const renderDraggableChild = (provider, snapshot) => {
    const isHover = isMouseHover && !snapshot.isDragging;

    const child = (
      <div
        ref={ref => {
          rowRef.current = ref;
          provider.innerRef(ref);
        }}
        {...provider.draggableProps}
        className={cx('step-row', isHover && 'hover')}
      >
        <span className={cx('column', 'drag-area', 'number')} {...provider.dragHandleProps}>
          {isHover ? (
            <DragHandler />
          ) : (
            <span
              className={cx('position-tip', isFieldCompleted && 'field', isCallTestStep && 'call')}
            >
              {index + 1}
            </span>
          )}
        </span>
        {isCallTestStep ? CallTestStepNode : StepFieldsMemoNode}
        <span className={cx('actions')} style={{ display: isHover ? 'flex' : 'none' }}>
          <Popconfirm
            okText={t('common.confirm')}
            placement="left"
            cancelText={t('common.cancel')}
            getPopupContainer={getRootContainer}
            title={t('components.business.testStep.copyStepTips')}
            onConfirm={() => actions.copy({ id: data.id, index })}
          >
            <Tooltip title={t('components.business.testStep.copyStep')}>
              <CopyOutlined className={cx('icon')} />
            </Tooltip>
          </Popconfirm>
          {enableDelete ? (
            <Popconfirm
              okText={t('common.confirm')}
              placement="left"
              cancelText={t('common.cancel')}
              getPopupContainer={getRootContainer}
              onConfirm={() => actions.delete(data.id)}
              title={t('components.business.testStep.deleteStepTips')}
            >
              <Tooltip title={t('components.business.testStep.deleteStep')}>
                <DeleteOutlined className={cx('icon')} key="DeleteOutlined" />
              </Tooltip>
            </Popconfirm>
          ) : null}
        </span>
      </div>
    );
    const usePortal = snapshot.isDragging;

    if (!usePortal) return child;

    return ReactDOM.createPortal(child, RBDPortal);
  };

  return (
    <Draggable index={index} draggableId={data.id}>
      {renderDraggableChild}
    </Draggable>
  );
};

const getAllCallTestIds = steps =>
  _.chain(steps)
    .map(step => step.callTestId)
    .filter(Boolean)
    .sort()
    .value();

type StepListProps = {
  steps: Step[];
  actions: any;
};

/** 测试步骤 list */
const StepList: React.FC<StepListProps> = ({ steps, actions }) => {
  const { t } = useI18n();
  const [form] = Form.useForm();
  const [testDetailEntities, setTestDetailEntities] = React.useState([]);

  const callTestMemoizedKey = getAllCallTestIds(steps).toString();
  // 处理测试继承数据回显
  React.useEffect(() => {
    const allCallTestIds = getAllCallTestIds(steps);
    if (allCallTestIds.length) {
      (async () => {
        const { items: testDetailEntities } = await getItemByIQL({ itemId: allCallTestIds });
        setTestDetailEntities(testDetailEntities);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callTestMemoizedKey]);

  // 增加 rbd portal
  React.useEffect(() => {
    if (!document.querySelector(REACT_DND_PORTAL_CLASS)) {
      RBDPortal = document.createElement('div');
      RBDPortal.classList.add(REACT_DND_PORTAL_CLASS);
      document.body.appendChild(RBDPortal);
    }
  }, []);

  // 处理测试步骤渲染数据
  const stepRowData = React.useMemo(() => {
    return (
      steps?.map(step => {
        const callTestEntity = testDetailEntities.find(item => item.objectId === step.callTestId);
        // 内置表单字段处理
        const builtinFields = _.chain(step)
          .pick(BuiltinFieldKeys)
          .toPairsIn()
          .map(([key, value]) => ({ key, value }))
          .value();

        // 后续可能会增加对自定义字段支持
        const fields = builtinFields
          .concat(step.customFields ?? [])
          .map(field => getFieldByImpl(field, t));

        return _.chain(step)
          .pick(['id', 'callTestId'])
          .assign({ fields, callTestEntity })
          .value() as StepRow;
      }) ?? []
    );
  }, [steps, testDetailEntities, t]);

  React.useEffect(() => {
    const fieldValues = _.chain(stepRowData)
      .reduce((acc, row) => {
        if (!row.fields.length) return acc;

        return {
          ...acc,
          [row.id]: _.chain(row.fields)
            .reduce((acc, field) => ({ ...acc, [field.key]: field.value }), {})
            .value(),
        };
      }, {})
      .value();
    form.setFieldsValue(fieldValues);
  }, [form, stepRowData]);

  const handleDragEnd = React.useCallback(
    ({ source, destination }) => {
      actions?.swap({
        sourceIndex: source.index,
        destinationIndex: destination.index,
      });
    },
    [actions],
  );

  const handleValuesChange = React.useCallback(
    value => {
      const needUpdateValues = Object.entries(value).reduce((acc, [stepId, value]) => {
        const builtinFields = _.pick(value, BuiltinFieldKeys);
        // 处理自定义字段 {} -> StepField[]
        const customFields = _.chain(value as Record<string, any>)
          .omit(BuiltinFieldKeys)
          .toPairsIn()
          .map(([key, value]) => ({ key, value }))
          .value();

        const currentStep = steps.find(step => step.id === stepId);

        return Object.assign({}, acc, {
          [stepId]: Object.assign({}, currentStep, {
            ...builtinFields,
            customFields,
          }),
        });
      }, {});
      actions?.update(needUpdateValues);
    },
    [actions, steps],
  );

  return (
    <Form form={form} onValuesChange={handleValuesChange} component={false}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={cx('list')}>
          <div className={cx('header')}>
            <span className={cx('column', 'drag-area')}>#</span>
            {StepFieldImpl(t).map(field => (
              <span className={cx('column', 'field')} key={field.key}>
                {field.title}
              </span>
            ))}
          </div>

          <NextStepFieldProvider addStep={actions.add} stepRowData={stepRowData}>
            <Droppable droppableId="step">
              {provider => (
                <div className={cx('body')} {...provider.droppableProps} ref={provider.innerRef}>
                  {stepRowData.map((row, index) => (
                    <StepRow
                      actions={actions}
                      key={row.id}
                      data={row}
                      index={index}
                      enableDelete={stepRowData.length > 1}
                    />
                  ))}
                  {provider.placeholder}
                </div>
              )}
            </Droppable>
          </NextStepFieldProvider>
        </div>
      </DragDropContext>
    </Form>
  );
};

export default React.memo(StepList);
