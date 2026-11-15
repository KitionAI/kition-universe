// Public kit order: motion first (owner decision, 2026-11-15), then the order of Kition's kits/modules.json.
// Keep browser progress, localized copy and data validation on the same list.
export const KIT_IDS = ['motion', 'note', 'table', 'board', 'photo', 'film', 'doc', 'sheet', 'slide', 'pdf', 'vector', 'layout', 'cad', 'html', 'scene', 'design'] as const;
export const KIT_COUNT = KIT_IDS.length;
