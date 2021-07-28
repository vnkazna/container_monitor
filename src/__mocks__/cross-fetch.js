const DEFAULT_FETCH_RESPONSE = '# Fabulous Project\n\nThis project does fabulous things.';

module.exports = {
  default: jest.fn().mockResolvedValue({
    ok: true,
    async text() {
      return DEFAULT_FETCH_RESPONSE;
    },
  }),
  DEFAULT_FETCH_RESPONSE,
};
