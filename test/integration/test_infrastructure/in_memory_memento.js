/* This is an in-memory implementation of the VS Code globalState */
class InMemoryMemento {
  constructor() {
    this.state = {};
  }

  update(key, value) {
    this.state[key] = value;
  }

  get(key, defaultValue) {
    return this.state[key] || defaultValue;
  }
}
module.exports = { InMemoryMemento };
