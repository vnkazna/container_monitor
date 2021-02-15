const { tokenService } = require('../../../src/services/token_service');
const { InMemoryMemento } = require('./in_memory_memento');

const useInMemoryGlobalStateInTokenService = () => {
  tokenService.init({
    globalState: new InMemoryMemento(),
  });
};

const initializeTestEnvironment = () => {
  useInMemoryGlobalStateInTokenService();
};

module.exports = { initializeTestEnvironment };
