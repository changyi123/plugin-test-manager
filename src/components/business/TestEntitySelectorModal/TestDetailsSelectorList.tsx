import React, { useEffect, useState } from 'react';
import { Checkbox } from 'antd';
import { CheckboxValueType } from 'antd/lib/checkbox/Group';

// 接受参数：
// 1、所选测试用例库信息 testRportInfo
// 2、当前测试计划下已关联用例 ids

// 返回数据
// 1、选中目标测试用例 ids

// 实现交互
// 1、切换当前用例库和当前用例库的子用例库交互
// 2、全选交互，全选选择所有用例库，选择用例库全选用例库下的测试用例，选择测试用例半选用例库，半选全选

// 左侧树交互优化：
// 1、折叠和点击交互分开

const TestDetailsSelectorList: React.FC<any> = () => {
  const CheckboxGroup = Checkbox.Group;

  const [indeterminate, setIndeterminate] = useState(false);
  const [checkedAll, setCheckedAll] = useState(false);
  const [checkData, setCheckData] = useState([
    {
      label: '用例库1',
      value: 'rep1',
      children: [
        {
          label: '用例1',
          value: 'test1',
        },
        {
          label: '用例2',
          value: 'test2',
        },
      ],
    },
    {
      label: '用例库2',
      value: 'rep2',
      children: [
        {
          label: '用例3',
          value: 'test3',
        },
        {
          label: '用例4',
          value: 'test4',
        },
      ],
    },
  ]);
  const [checkedTestValue, setCheckedTestValue] = useState({});
  const [reportCheckedValue, setReportCheckedValue] = useState({});

  const checkAllTest = e => {
    setCheckedAll(e.target.checked);
    indeterminate && setIndeterminate(false);
    setReportCheckedValue(
      checkData.reduce((prev, cur) => {
        prev[cur.value] = {
          checked: e.target.checked,
          indeterminate: false,
        };
        return prev;
      }, {}),
    );
  };

  useEffect(() => {
    // const _checkedReport = [...Object.keys(reportCheckedValue)];
    // if (_checkedReport.length && _checkedReport.length !== checkData.length) {
    //   checkedAll && setCheckedAll(v => !v);
    // }
    const selectedReport = [...Object.values(reportCheckedValue)].filter((d: any) => d.checked);
    const indetReport = [...Object.values(reportCheckedValue)].filter((d: any) => d.indeterminate);
    if (selectedReport.length === checkData.length) {
      setCheckedAll(true);
      indeterminate && setIndeterminate(false);
    } else {
      checkedAll && setCheckedAll(false);
    }

    if (selectedReport.length && selectedReport.length !== checkData.length) {
      setIndeterminate(true);
    }
    if (indetReport.length) {
      !indeterminate && setIndeterminate(true);
    }
    if (!selectedReport.length && !indetReport.length) {
      indeterminate && setIndeterminate(false);
      checkedAll && setCheckedAll(false);
    }
  }, [checkData, reportCheckedValue]);

  useEffect(() => {
    // const checkedTestValue = [...Object.entries(reportCheckedValue)].reduce(
    //   (prev, [key, value]) => {
    //     const delValue = checkData.find(d => d.value === type).children.map(d => d.value);
    //     return prev;
    //   },
    //   {},
    // );
  }, [reportCheckedValue]);

  const checkReport = (e, type: string) => {
    const delValue = checkData.find(d => d.value === type).children.map(d => d.value);
    setReportCheckedValue(value => ({
      ...value,
      [type]: {
        checked: e.target.checked,
        indeterminate: false,
      },
    }));
    setCheckedTestValue(value => ({
      ...value,
      [type]: e.target.checked ? delValue : [],
    }));
  };

  const checkTest = (val: CheckboxValueType[], type: string) => {
    setCheckedTestValue(value => ({
      ...value,
      [type]: val,
    }));
    const delValue = checkData.find(d => d.value === type).children.map(d => d.value);
    if (delValue.length) {
      setReportCheckedValue(value => ({
        ...value,
        [type]: {
          checked: delValue.length === val.length,
          indeterminate: delValue.length !== val.length && !!val.length,
        },
      }));
    }
  };

  // const CheckBoxList = (options) => {
  //   <Checkbox indeterminate={indeterminate} checked={checkedAll} onChange={checkAllTest}>
  //     全选
  //   </Checkbox>
  //   <CheckboxGroup options={checkData}></CheckboxGroup>

  // }

  return (
    <>
      <Checkbox indeterminate={indeterminate} checked={checkedAll} onChange={checkAllTest}>
        全选
      </Checkbox>
      {checkData.map(box => (
        <div key={box.value}>
          <Checkbox
            indeterminate={reportCheckedValue?.[box.value]?.indeterminate ?? false}
            checked={reportCheckedValue?.[box.value]?.checked ?? false}
            onChange={e => checkReport(e, box.value)}
          >
            {box.label}
          </Checkbox>
          <CheckboxGroup
            options={box.children}
            value={[...Object.values(checkedTestValue)].flat() as string[]}
            onChange={val => checkTest(val, box.value)}
          ></CheckboxGroup>
        </div>
      ))}
    </>
  );
};

export default TestDetailsSelectorList;
