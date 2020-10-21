export const prettyJson = (obj: Record<string, unknown>) => JSON.stringify(obj, null, 2);
export const stackToArray = (stack: string | undefined) => stack && stack.split('\n');

export interface IDetailedError extends Error {
  readonly details: string;
}
