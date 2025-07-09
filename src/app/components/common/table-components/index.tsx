import { TableCell } from 'apps-team-components-v1';
import React from 'react';

import DataQuoto from './data-quote';
import TestReference from './test-reference';
import { DATA_QUOTE, isCustomFieldComponent, TEST_REFERENCE } from './utils';
export const ALL_COMPONENTS = {
  [TEST_REFERENCE]: {
    Cell: TestReference.Cell,
    Field: TestReference.Field,
  },
  [DATA_QUOTE]: {
    Cell: DataQuoto.Cell,
    Field: DataQuoto.Field,
  },
};

const TableComponent = function TableComponent(props) {
  const { column } = props;
  const { cellType } = column;
  const Component = ALL_COMPONENTS[cellType]?.Cell;

  return <Component {...props} />;
};

function tableCellHOC(Component) {
  // eslint-disable-next-line react/display-name
  return props => {
    const { column } = props;
    const { cellType } = column;
    const TableCellFinal = isCustomFieldComponent(cellType) ? TableComponent : Component;
    return <TableCellFinal {...props} />;
  };
}
export default tableCellHOC(TableCell);
