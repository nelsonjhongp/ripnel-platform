const {
  findTechnicalProfileByStyleId,
  upsertTechnicalProfileByStyleId,
} = require('./style-technical-profiles.repo');

async function getStyleTechnicalProfile(styleId) {
  return findTechnicalProfileByStyleId(styleId);
}

async function saveStyleTechnicalProfile(styleId, payload) {
  await upsertTechnicalProfileByStyleId(styleId, payload);
  return findTechnicalProfileByStyleId(styleId);
}

module.exports = {
  getStyleTechnicalProfile,
  saveStyleTechnicalProfile,
};
