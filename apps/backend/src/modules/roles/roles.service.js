const { findAllRoles } = require('./roles.repo');

async function listRoles() {
  return findAllRoles();
}

module.exports = {
  listRoles,
};
