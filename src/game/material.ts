export type MaterialId = 'iron_ore' | 'herb';

export const MATERIAL_LABELS: Record<MaterialId, string> = {
  iron_ore: 'Fer brut',
  herb: 'Herbe médicinale',
};

export function materialLabel(id: string): string {
  return MATERIAL_LABELS[id as MaterialId] ?? id;
}
