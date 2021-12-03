export const prettyJson = (obj: Record<string, unknown>): string => JSON.stringify(obj, null, 2);
export const stackToArray = (stack: string | undefined): string[] => (stack ?? '').split('\n');

export interface IDetailedError extends Error {
  readonly details: string;
}

export function isDetailedError(object: any): object is IDetailedError {
  return Boolean(object.details);
}
