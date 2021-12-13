import React from 'react';
import PropTypes from 'prop-types';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export const GlobalDndContext: React.FC = props => {
  return (
    <DndProvider backend={HTML5Backend} context={window} key={1}>
      {props.children}
    </DndProvider>
  );
};

GlobalDndContext.propTypes = { children: PropTypes.node };

export default GlobalDndContext;
