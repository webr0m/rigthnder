export const updateState = (info) =>
  info.status === 11
    ? 'ready'
    : [1, 2, 3].includes(info.status)
      ? 'downloading'
      : [4, 6].includes(info.status)
        ? 'current'
        : info.available
          ? 'available'
          : 'current';
