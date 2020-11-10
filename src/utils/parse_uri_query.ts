export const parseUriQuery = (query: string): Record<string, string | undefined> => {
  const parts = query.split('&');
  return parts.reduce((acc, part) => {
    const keyVal = part.split('=');
    return { ...acc, [keyVal[0]]: keyVal[1] };
  }, {});
};
