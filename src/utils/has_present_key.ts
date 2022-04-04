export const hasPresentKey =
  <K extends string | number | symbol>(key: K) =>
  <T, V>(a: T & { [k in K]?: V | null }): a is T & { [k in K]: V } =>
    a[key] !== undefined && a[key] !== null;
