/**
 * ============================================================================
 * 文件名：common/mappings/visual-variant.ts（visualVariant 枚举映射单一来源）
 * ============================================================================
 * 作用：消除鱼种 visualVariant 枚举的散落映射
 *
 * 之前的问题：
 *   - fish-species.service.ts:81-85 内联 5 条 LEGACY_VV_MAPPING
 *   - migrations/fix-visualvariant-legacy.ts:15-19 内联 3 条 LEGACY_MAPPING
 *   - 两处定义不严格一致（service 多 'purple→blue' 和 'spotted→spots' 等老映射）
 *
 * 新架构：
 *   - 本文件是唯一真相源
 *   - LEGACY_TO_CANONICAL 涵盖所有历史映射
 *   - canonicalize() 函数：输入任意字符串，输出 5x5x5 规范值
 *
 * @see https://docs.google.com/document/d/xxx §2.2 — 5×5×5=125 spec
 * ============================================================================
 */

/**
 * visualVariant 三个维度的 5x5x5 = 125 组合规范值
 */
export const VISUAL_VARIANT_VALUES = {
  color: ['red', 'orange', 'yellow', 'green', 'blue'] as const,
  pattern: ['solid', 'stripe', 'spots', 'gradient', 'camouflage'] as const,
  body: ['oval', 'diamond', 'streamlined', 'disc', 'elongated'] as const,
} as const;

export type VVColor = (typeof VISUAL_VARIANT_VALUES.color)[number];
export type VVPattern = (typeof VISUAL_VARIANT_VALUES.pattern)[number];
export type VVBody = (typeof VISUAL_VARIANT_VALUES.body)[number];

/**
 * 历史 → 规范 的 legacy 映射
 *
 * 来源：
 *   - fish-species.service.ts:81-85 (v10.1.4 引入的兼容映射)
 *   - migrations/fix-visualvariant-legacy.ts:15-19 (DB 修正映射)
 *   - v10.1.3 / v10.1.4 changelog
 *
 * key 格式：'<dimension>.<legacy>'（如 'color.purple'）
 * value：规范值（5 选 1）
 */
export const LEGACY_TO_CANONICAL: Record<string, string> = {
  // === color 维度 ===
  'color.purple': 'blue',         // v10.1.4 service 映射：indigo 近似
  'color.golden': 'yellow',       // migrations + service 共认（PR P3-15 统一）

  // === pattern 维度 ===
  'pattern.spotted': 'spots',     // v10.1.4 service 映射：复数一致化
  'pattern.striped': 'stripe',    // 共认
  'pattern.scale': 'camouflage',  // v10.1.4 service 映射：旧 scale → 新 camouflage

  // === body 维度 ===
  'body.slim': 'elongated',       // v10.1.4 service 映射
  'body.normal': 'oval',          // v10.1.4 service 映射
  'body.round': 'disc',           // migrations + service 共认
  'body.plump': 'diamond',        // v10.1.4 service 映射
};

/**
 * canonicalize —— 把任意维度 + 值映射到规范值
 *
 * @param dimension 'color' | 'pattern' | 'body'
 * @param legacy 用户输入值（可能是历史值、typo、或规范值）
 * @returns 规范值；若不在映射则原样返回（caller 决定 reject）
 *
 * @example
 * ```ts
 * canonicalize('color', 'purple')   // → 'blue'
 * canonicalize('color', 'blue')     // → 'blue' (no-op)
 * canonicalize('color', 'unknown')  // → 'unknown' (passthrough)
 * canonicalize('pattern', 'spotted') // → 'spots'
 * canonicalize('body', 'round')     // → 'disc'
 * ```
 */
export function canonicalize(
  dimension: 'color' | 'pattern' | 'body',
  value: string,
): string {
  const key = `${dimension}.${value}`;
  return LEGACY_TO_CANONICAL[key] ?? value;
}

/**
 * isValidVV —— 检查值是否在 5 个规范值中
 */
export function isValidVV(
  dimension: 'color' | 'pattern' | 'body',
  value: string,
): boolean {
  return (VISUAL_VARIANT_VALUES[dimension] as readonly string[]).includes(value);
}