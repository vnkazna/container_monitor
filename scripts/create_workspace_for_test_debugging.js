#!/usr/bin/env node

// This script creates a temporary workspace that can be used for debugging integration tests
const { default: createTmpWorkspace } = require('../out/create_tmp_workspace');

createTmpWorkspace(false).then(console.log);
