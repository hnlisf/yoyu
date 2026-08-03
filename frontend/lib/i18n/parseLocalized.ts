/**
 * ============================================================================
 * 文件名：i18n/parseLocalized.ts（前端 i18n 字段解析助手）
 * ============================================================================
 * 作用：消除散落在 frontend/lib/api 的 inline JSON.parse 模式
 *
 * P4 §3.4：PR 22 — 前端版 helper（零依赖，对应后端 src/common/i18n.ts）
 *
 * 支持输入：
 *   - string （已解析或 JSON-encoded 字符串）
 *   - object / array （已解析对象）
 *   - null / undefined → 返回 fallback
 *
 * 设计取舍：
 *   - 零依赖（与后端解耦，方便 SSR）
 *   - 与 backend safeParse / getLocalized 行为对齐（前端取 locale 后调用）
 *
 * @see backend/src/common/i18n.ts
 * ============================================================================
 */

/**
 * safeParse<T> —— 严格类型 JSON 解析，失败返回 fallback
 *
 * 与原生 JSON.parse 区别：
 *   - 失败不抛错，返回 fallback
 *   - null / undefined / '' → 直接 fallback
 *   - 已是非字符串对象 / 数组 → 直接返回
 */
export function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  if (typeof raw !== 'string') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * parseLocalized —— 取 i18n 字段的 locale 对应值
 *
 * @param field   i18n 字段（string / object / null）
 * @param locale  'zh' / 'en' / 'ja'
 * @param fallback 若都缺，返这个
 *
 * @example
 * ```ts
 * parseLocalized(species.nameI18n, 'zh', '金鱼')
 * // → '金鱼'（or 'Goldfish' / '金魚' / fallback）
 * ```
 */
export function parseLocalized(
  field: unknown,
  locale: string,
  fallback: string,
): string {
  if (field == null) return fallback;

  // 已是 string —— 试 parse JSON，parse 失败则当作 literal
  if (typeof field === 'string') {
    const parsed = safeParse<string | Record<string, string>>(field, null);
    if (parsed === null) return field || fallback;
    if (typeof parsed === 'string') return parsed || fallback;
    field = parsed;  // fall through to object branch
  }

  // 数组 / 其它类型 —— fallback
  if (typeof field !== 'object' || Array.isArray(field)) return fallback;

  const obj = field as Record<string, unknown>;
  const chain = [locale, 'zh', 'en', 'ja'];  // fallback chain

  for (const l of chain) {
    const v = obj[l];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  // 任意非空 string
  for (const v of Object.values(obj)) {
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return fallback;
}