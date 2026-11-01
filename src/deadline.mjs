// A native bridge or a transport can fail to settle even after an abort. Race
// the operation itself, and never let a late result resume the caller's work.
export async function withDeadline(
  work,
  milliseconds,
  message,
  code = 'OPERATION_TIMEOUT',
  onTimeout,
) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve(work),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = Object.assign(new Error(message), { code });
          reject(error);
          onTimeout?.();
        }, milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
