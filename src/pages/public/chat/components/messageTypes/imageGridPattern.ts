export type ImageGridRow<T> = {
  columns: number;
  items: T[];
};

export const resolveImageGridPattern = (count: number): number[] => {
  const safeCount = Math.max(1, Math.min(9, count));
  switch (safeCount) {
    case 1:
      return [1];
    case 2:
      return [2];
    case 3:
      return [1, 2];
    case 4:
      return [2, 2];
    case 5:
      return [2, 3];
    case 6:
      return [1, 2, 3];
    case 7:
      return [3, 1, 3];
    case 8:
      return [3, 2, 2, 1];
    default:
      return [3, 2, 2, 2];
  }
};

export const buildImageGridRows = <T>(items: T[]): ImageGridRow<T>[] => {
  if (items.length === 0) {
    return [];
  }

  const pattern = resolveImageGridPattern(items.length);
  const rows: ImageGridRow<T>[] = [];
  let cursor = 0;

  for (const desiredColumns of pattern) {
    const rowItems = items.slice(cursor, cursor + desiredColumns);
    if (rowItems.length === 0) {
      break;
    }
    rows.push({
      columns: rowItems.length,
      items: rowItems,
    });
    cursor += desiredColumns;
    if (cursor >= items.length) {
      break;
    }
  }

  return rows;
};
