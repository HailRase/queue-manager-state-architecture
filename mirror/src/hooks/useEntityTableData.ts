import {
  TableEntityKey,
  TableItem,
} from 'app/providers/TableDataProvider/model/types';
import { useTableDataContext } from 'app/providers/TableDataProvider/TableDataProvider';
import { useMemo } from 'react';

interface EntityTableDataReturnType<K extends TableEntityKey> {
  items: TableItem<K>[];
  pagination: {
    size: number;
    page: number;
    pages: number;
    total: number;
  };
}
export function useEntityTableData<K extends TableEntityKey>(
  entityName: K
): EntityTableDataReturnType<K> {
  const { tableData } = useTableDataContext();

  const entityData = tableData[entityName];

  const items = useMemo(() => entityData.items, [entityData.items]);

  const pagination = useMemo(
    () => ({
      size: entityData.size,
      page: entityData.page,
      pages: entityData.pages,
      total: entityData.total,
    }),
    [entityData.size, entityData.page, entityData.pages, entityData.total]
  );

  return {
    items,
    pagination,
  };
}
