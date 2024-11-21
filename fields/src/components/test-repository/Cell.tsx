// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { FC, useEffect, useState } from 'react';

import { CellProp } from '../types';

const Parse = global.Parse;
const repositoryQuery = new Parse.Query('test_manager_Repository');

const Cell: FC<CellProp> = props => {
  const { value } = props;
  const [repository, setRepository] = useState([]);

  useEffect(() => {
    if (!value) return;
    (async () => {
      const repository = await repositoryQuery.equalTo('objectId', value).select('name').first();
      setRepository(repository.get('name'));
    })();
  }, [value]);

  return <span>{repository}</span>;
};

export default Cell;
