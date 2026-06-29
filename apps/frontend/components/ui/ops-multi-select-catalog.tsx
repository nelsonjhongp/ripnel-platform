import { OpsColorSwatch, OpsMultiSelectMenu, OpsSelectionChip } from "@/components/ui/ops-selection";
import { FieldLabel } from "@/components/ui/ops-field-label";

type CatalogItem = {
  [key: string]: unknown;
  active?: boolean;
  code?: string | null;
  name?: string | null;
  hex?: string | null;
  sort_order?: number | null;
};

function getItemId(item: CatalogItem, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (value) {
      return String(value);
    }
  }

  return "";
}

function getCatalogVisibleLabel(item: CatalogItem) {
  return String(item.name || item.code || "");
}

function getSizeLabel(item: CatalogItem) {
  return String(item.code || item.name || "");
}

export function MultiSelectCatalog({
  label,
  items,
  selectedIds,
  idKeys,
  placeholder,
  onToggle,
  onCreate,
  colorMode = false,
}: {
  label: string;
  items: CatalogItem[];
  selectedIds: string[];
  idKeys: string[];
  placeholder: string;
  onToggle: (id: string) => void;
  onCreate: () => void;
  colorMode?: boolean;
}) {
  const selectedItems = items.filter((item) => selectedIds.includes(getItemId(item, idKeys)));
  const options = items.map((item) => {
    const itemId = getItemId(item, idKeys);
    const visibleLabel = colorMode ? getCatalogVisibleLabel(item) : getSizeLabel(item);

    return {
      value: itemId,
      label: visibleLabel,
      leading: colorMode ? <OpsColorSwatch hex={item.hex} /> : undefined,
    };
  });

  return (
    <section className="space-y-2">
      <FieldLabel actionLabel="Crear nuevo" onAction={onCreate}>{label}</FieldLabel>
      <OpsMultiSelectMenu
        selectedValues={selectedIds}
        onToggle={onToggle}
        placeholder={placeholder}
        options={options}
        formatCountLabel={(count) => `${count} ${label.toLowerCase()} seleccionadas`}
      />
      <div className="flex min-h-8 flex-wrap gap-1.5">
        {selectedItems.length ? (
          selectedItems.map((item) => {
            const id = getItemId(item, idKeys);
            return (
              <OpsSelectionChip
                key={id}
                label={colorMode ? getCatalogVisibleLabel(item) : getSizeLabel(item)}
                leading={colorMode ? <OpsColorSwatch hex={item.hex} className="h-3 w-3" /> : undefined}
                onRemove={() => onToggle(id)}
              />
            );
          })
        ) : (
          <span className="text-xs text-[var(--ops-text-muted)]">
            {colorMode ? "Sin colores: se usara UNICO si aplica." : "Selecciona al menos una talla."}
          </span>
        )}
      </div>
    </section>
  );
}
