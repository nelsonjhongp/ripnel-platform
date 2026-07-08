const catalogConfigs = {
  sizes: {
    key: 'sizes',
    table: 'sizes',
    idField: 'size_id',
    label: 'Size',
    entityLabel: 'talla',
    hasCode: true,
    editableFields: ['name', 'sort_order', 'description', 'active'],
    orderBy: 'sort_order asc, name asc',
    selectColumns: [
      'size_id',
      'code',
      'name',
      'sort_order',
      'description',
      'active',
      'created_at',
      'updated_at',
    ],
  },
  colors: {
    key: 'colors',
    table: 'colors',
    idField: 'color_id',
    label: 'Color',
    entityLabel: 'color',
    hasCode: true,
    editableFields: ['name', 'hex', 'active'],
    orderBy: 'name asc',
    selectColumns: [
      'color_id',
      'code',
      'name',
      'hex',
      'active',
      'created_at',
      'updated_at',
    ],
  },
  'garment-types': {
    key: 'garment-types',
    table: 'garment_types',
    idField: 'garment_type_id',
    label: 'Garment type',
    entityLabel: 'tipo de prenda',
    hasCode: true,
    editableFields: ['name', 'active'],
    orderBy: 'name asc',
    selectColumns: [
      'garment_type_id',
      'code',
      'name',
      'active',
      'created_at',
      'updated_at',
    ],
  },
};

function getCatalogConfig(key) {
  return catalogConfigs[key] || null;
}

module.exports = {
  catalogConfigs,
  getCatalogConfig,
};
