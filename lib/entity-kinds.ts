export const ENTITY_KINDS={mosque:'مسجد',quran_center:'مركز تحفيظ قرآن',religious_center:'مركز ديني'} as const;
export type EntityKind=keyof typeof ENTITY_KINDS;
