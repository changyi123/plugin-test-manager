/* eslint-disable prettier/prettier */
import React, { FC , useRef } from 'react';
import { ConfigProvider, Table } from '@osui/ui';
import { Empty } from 'antd';
const customizeRenderEmpty = () => (
  <div className="ant-empty ant-empty-normal"
     style={{
      paddingTop:70,
      paddingBottom:95.5,
      display:"flex",
      flexDirection:"column",
      alignItems:"center"
      }}>
    <Empty imageStyle={{width:184,height:100}} />
  </div>
);

const CommonTable: FC<any> = props => {
  const tableRef = useRef<HTMLDivElement>();
  return (
    <ConfigProvider renderEmpty={customizeRenderEmpty}>
      <div ref={tableRef}>
        <Table {...props} />
      </div>
    </ConfigProvider>
  );
};

export default CommonTable;
