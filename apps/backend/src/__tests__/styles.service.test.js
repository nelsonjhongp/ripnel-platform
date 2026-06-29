const { afterEach, beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");

const stylesRepo = require("../modules/styles/styles.repo");
const stylesCode = require("../modules/styles/styles-code");

const SERVICE_PATH = require.resolve("../modules/styles/styles.service");

const STYLE_ID = "11111111-1111-4111-8111-111111111111";
const GARMENT_TYPE_ID = "22222222-2222-4222-8222-222222222222";

const originalRepo = {
  findAllStyles: stylesRepo.findAllStyles,
  findStyleCodesByPrefix: stylesRepo.findStyleCodesByPrefix,
  findGarmentTypeById: stylesRepo.findGarmentTypeById,
  findStyleById: stylesRepo.findStyleById,
  insertStyle: stylesRepo.insertStyle,
  countActiveVariantsByStyleId: stylesRepo.countActiveVariantsByStyleId,
  updateStyle: stylesRepo.updateStyle,
};

function restoreStubs() {
  Object.assign(stylesRepo, originalRepo);
  delete require.cache[SERVICE_PATH];
}

function loadStylesService(overrides = {}) {
  stylesRepo.findAllStyles = overrides.findAllStyles || (async () => []);
  stylesRepo.findStyleCodesByPrefix =
    overrides.findStyleCodesByPrefix || (async () => []);
  stylesRepo.findGarmentTypeById =
    overrides.findGarmentTypeById ||
    (async () => ({
      garment_type_id: GARMENT_TYPE_ID,
      code: "POL",
      name: "Polos",
    }));
  stylesRepo.findStyleById =
    overrides.findStyleById ||
    (async () => ({
      style_id: STYLE_ID,
      style_code: "POL-OVERSIZ",
      name: "Polo Oversize",
      description: null,
      active: true,
    }));
  stylesRepo.insertStyle = overrides.insertStyle || (async () => STYLE_ID);
  stylesRepo.countActiveVariantsByStyleId =
    overrides.countActiveVariantsByStyleId || (async () => 0);
  stylesRepo.updateStyle = overrides.updateStyle || (async () => STYLE_ID);
  delete require.cache[SERVICE_PATH];
  return require(SERVICE_PATH);
}

describe("styles service", () => {
  beforeEach(() => {
    restoreStubs();
  });

  afterEach(() => {
    restoreStubs();
  });

  it("buildStyleCodeBase ignores any old fabric-driven suffixes", () => {
    const code = stylesCode.buildStyleCodeBase({
      garmentTypeCode: "pol",
      fabricCode: "FT",
      name: "Polo Oversize Basico",
      maxLength: 30,
    });

    assert.equal(code, "POL-POLOOVE");
  });

  it("createStyle generates a commercial style code and inserts only commercial fields", async () => {
    let capturedPayload = null;
    let findAllStylesCalls = 0;
    const service = loadStylesService({
      findStyleCodesByPrefix: async () => ["POL-POLOOVE"],
      insertStyle: async (payload) => {
        capturedPayload = payload;
        return STYLE_ID;
      },
      findAllStyles: async () => {
        findAllStylesCalls += 1;

        if (findAllStylesCalls === 1) {
          return [];
        }

        return [
          {
            style_id: STYLE_ID,
            style_code: "POL-POLOOVE-2",
            name: "Polo Oversize",
            description: "Base comercial",
            active: true,
          },
        ];
      },
    });

    const result = await service.createStyle({
      garment_type_id: GARMENT_TYPE_ID,
      name: "  Polo Oversize  ",
      description: "  Base comercial  ",
      active: true,
    });

    assert.deepEqual(capturedPayload, {
      garment_type_id: GARMENT_TYPE_ID,
      style_code: "POL-POLOOVE-2",
      name: "Polo Oversize",
      description: "Base comercial",
      active: true,
    });
    assert.equal(result.style_id, STYLE_ID);
    assert.equal(result.style_code, "POL-POLOOVE-2");
  });

  it("createStyle rejects duplicate commercial names with separators normalized", async () => {
    const service = loadStylesService({
      findAllStyles: async () => [
        {
          style_id: "33333333-3333-4333-8333-333333333333",
          style_code: "CAF-RIP",
          name: "Cafarena - Rip",
          description: null,
          active: true,
        },
      ],
    });

    await assert.rejects(
      () =>
        service.createStyle({
          garment_type_id: GARMENT_TYPE_ID,
          name: "Cafarena Rip",
          description: null,
          active: true,
        }),
      (error) => {
        assert.equal(error.name, "AppError");
        assert.equal(error.statusCode, 409);
        assert.equal(error.message, "Style already exists");
        return true;
      }
    );
  });

  it("createStyle rejects descriptions over 240 characters", async () => {
    const service = loadStylesService();

    await assert.rejects(
      () =>
        service.createStyle({
          garment_type_id: GARMENT_TYPE_ID,
          name: "Polo Oversize",
          description: "x".repeat(241),
          active: true,
        }),
      (error) => {
        assert.equal(error.name, "AppError");
        assert.equal(error.statusCode, 400);
        assert.equal(error.message, "Style description cannot exceed 240 characters");
        return true;
      }
    );
  });

  it("patchStyle rejects technical and identity fields", async () => {
    const service = loadStylesService();

    await assert.rejects(
      () =>
        service.patchStyle(STYLE_ID, {
          target_id: "33333333-3333-4333-8333-333333333333",
        }),
      (error) => {
        assert.equal(error.name, "AppError");
        assert.equal(error.statusCode, 400);
        assert.equal(error.message, "Style identity fields cannot be updated");
        return true;
      }
    );
  });

  it("patchStyle rejects duplicate commercial names with accents normalized", async () => {
    const service = loadStylesService({
      findAllStyles: async () => [
        {
          style_id: STYLE_ID,
          style_code: "POL-OVE",
          name: "Polo Oversize",
          description: null,
          active: true,
        },
        {
          style_id: "33333333-3333-4333-8333-333333333333",
          style_code: "POL-BAS",
          name: "Polo Básico",
          description: null,
          active: true,
        },
      ],
    });

    await assert.rejects(
      () =>
        service.patchStyle(STYLE_ID, {
          name: "Polo Basico",
        }),
      (error) => {
        assert.equal(error.name, "AppError");
        assert.equal(error.statusCode, 409);
        assert.equal(error.message, "Style already exists");
        return true;
      }
    );
  });

  it("patchStyle allows keeping the same commercial name for the current style", async () => {
    let capturedPayload = null;
    const service = loadStylesService({
      findAllStyles: async () => [
        {
          style_id: STYLE_ID,
          style_code: "CAF-RIP",
          name: "Cafarena - Rip",
          description: null,
          active: true,
        },
      ],
      updateStyle: async (styleId, payload) => {
        capturedPayload = { styleId, payload };
        return STYLE_ID;
      },
      findStyleById: async () => ({
        style_id: STYLE_ID,
        style_code: "CAF-RIP",
        name: "Cafarena - Rip",
        description: null,
        active: true,
      }),
    });

    await service.patchStyle(STYLE_ID, {
      name: "Cafarena Rip",
    });

    assert.deepEqual(capturedPayload, {
      styleId: STYLE_ID,
      payload: {
        name: "Cafarena Rip",
        description: null,
        active: true,
      },
    });
  });

  it("patchStyle rejects descriptions over 240 characters", async () => {
    const service = loadStylesService();

    await assert.rejects(
      () =>
        service.patchStyle(STYLE_ID, {
          description: "x".repeat(241),
        }),
      (error) => {
        assert.equal(error.name, "AppError");
        assert.equal(error.statusCode, 400);
        assert.equal(error.message, "Style description cannot exceed 240 characters");
        return true;
      }
    );
  });
});
