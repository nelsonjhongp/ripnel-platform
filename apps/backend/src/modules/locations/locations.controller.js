const { createLocation, listLocations, patchLocation } = require('./locations.service');

async function getLocations(req, res, next) {
  try {
    const locations = await listLocations();

    res.json({
      ok: true,
      data: locations,
    });
  } catch (error) {
    next(error);
  }
}

async function postLocation(req, res, next) {
  try {
    const location = await createLocation(req.body);

    res.status(201).json({
      ok: true,
      data: location,
    });
  } catch (error) {
    next(error);
  }
}

async function patchLocationById(req, res, next) {
  try {
    const location = await patchLocation(req.params.locationId, req.body);

    res.json({
      ok: true,
      data: location,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getLocations,
  postLocation,
  patchLocationById,
};
