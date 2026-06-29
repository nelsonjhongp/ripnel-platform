const { query } = require('../../shared/db');

async function findTechnicalProfileByStyleId(styleId) {
  const result = await query(
    `select
       technical_profile_id,
       style_id,
       fabric_id,
       fabric_detail_id,
       active,
       created_at,
       updated_at
     from product_technical_profiles
     where style_id = $1`,
    [styleId]
  );

  return result.rows[0] || null;
}

async function upsertTechnicalProfileByStyleId(styleId, payload = {}) {
  const result = await query(
    `insert into product_technical_profiles (
       style_id,
       fabric_id,
       fabric_detail_id,
       active
     )
     values ($1, $2, $3, $4)
     on conflict (style_id) do update
     set
       fabric_id = excluded.fabric_id,
       fabric_detail_id = excluded.fabric_detail_id,
       active = excluded.active,
       updated_at = current_timestamp
     returning technical_profile_id`,
    [
      styleId,
      payload.fabric_id || null,
      payload.fabric_detail_id || null,
      typeof payload.active === 'boolean' ? payload.active : true,
    ]
  );

  return result.rows[0]?.technical_profile_id || null;
}

module.exports = {
  findTechnicalProfileByStyleId,
  upsertTechnicalProfileByStyleId,
};
