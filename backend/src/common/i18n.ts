/**
 * ============================================================================
 * 文件名：common/i18n.ts（i18n JSON 字段统一助手）
 * ============================================================================
 * 作用：消除散落在 backend/src/** 的 13 个 `JSON.parse(...) [lang] ?? ...` 模式
 *
 * 为什么需要这个文件？
 *   - Prisma schema 用 `String` 列存 i18n JSON（SQLite 无 JSONB 支持）
 *   - 13 处服务代码各自手写 try/catch + JSON.parse + fallback
 *   - 代码重复 + 解析失败被静默吞掉 = 调试噩梦
 *
 * 设计原则：
 *   - safeParse<T>  — 严格类型的 JSON 解析，失败返回 fallback（不再静默）
 *   - getLocalized  — 智能按 locale 取值，自动 fallback
 *   - localeFallbackChain — 公开 fallback 顺序（zh → en → ja）
 *
 * 使用约束：
 *   - 项目策略 harness.yaml → policies.jsonb.forbid_parse_outside_helper: true
 *   - 任何新代码禁止再写 JSON.parse(...) 直接调用，必须用本文件的 helper
 *
 * 替换路线（P2 PR 11 / SPEC AC-1.1.2）：
 *   backend/src/fish-species/fish-species.service.ts:67,152,153,154,158
 *   backend/src/fish/fish.service.ts:239
 *   backend/src/feeding-advice/feeding-advice.service.ts:96
 *   backend/src/weather/weather.service.ts:71
 *   backend/src/user/user.service.ts:41,265
 *   backend/src/preferences/preferences.service.ts:51
 *   backend/src/reminders/reminders.service.ts:31
 * ============================================================================
 */

/**
 * fallback locale 顺序：项目支持 zh + en + ja 三语
 * 中文优先（默认）→ 英文 → 日文 → 第一可用值
 */
const PROJECT_LOCALES = ['zh', 'en', 'ja'] as const;
export type SupportedLocale = (typeof PROJECT_LOCALES)[number];

/**
 * safeParse<T> — 严格类型 JSON 解析
 *
 * 与原生 JSON.parse 区别：
 *   - 失败不抛错，返回 fallback（caller 可继续运行）
 *   - 失败时 console.warn + 标记 payload（便于排查）
 *   - null / undefined / '' 一律返回 fallback
 *   - 已是非字符串对象 / 数组 → 直接返回（兼容）
 *
 * @param raw 原始字符串（来自 DB 列、user input 等）
 * @param fallback 解析失败时返回的值
 * @returns 解析后的对象 / fallback
 *
 * @example
 * ```ts
 * const stages = safeParse<Stage[]>(row.stages, []);
 * const favs   = safeParse<string[]>(prefs.favorites, []);
 * const title  = safeParse<Record<string,string>>(reminder.titleI18n, {});
 * ```
 */
export function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  // null / undefined / 空串 — 直接 fallback（最常见"无值"场景）
  if (raw == null || raw === '') return fallback;

  // 已经是对象 / 数组（JS 中一切皆对象）— 直接返回，避免 double-parse
  if (typeof raw !== 'string') return raw as T;

  // 真正的字符串 — JSON.parse
  try {
    return JSON.parse(raw) as T;
  } catch {
    // ⚠️ 关键：从"静默吞"升级到"结构化日志"
    // production 应配合 pino logger（PR 5+ 引入）
    // 这里用 console.warn 维持 PR 2 的最小依赖边界
    // eslint-disable-next-line no-console
    console.warn(
      `[i18n.safeParse] JSON 解析失败 — type=${typeof fallback}, ` +
        `payload(${raw.length} chars)=${raw.slice(0, 80)}${raw.length > 80 ? '...' : ''}`,
    );
    return fallback;
  }
}

/**
 * localeFallbackChain —— 返回 locale 的回退顺序
 *
 * 算法：
 *   1. 把请求 locale 作为首选
 *   2. 若不是项目支持 locale，降级到 'zh'（默认）
 *   3. 然后追加其他 PROJECT_LOCALES（排除已包含）
 *
 * @param locale 请求的 locale（如 'zh' / 'en' / 'ja' / 不支持的如 'fr'）
 * @returns 顺序的 locale 数组（首选在前）
 *
 * @example
 * ```ts
 * localeFallbackChain('zh')     // → ['zh', 'en', 'ja']
 * localeFallbackChain('fr')     // → ['zh', 'en', 'ja']
 * localeFallbackChain(undefined) // → ['zh', 'en', 'ja']
 * ```
 */
export function localeFallbackChain(locale?: string | null): string[] {
  const requested = (locale || 'zh').toLowerCase();
  const chain: string[] = [];

  // 1) 请求的 locale 若在支持列表中 → 优先
  if ((PROJECT_LOCALES as readonly string[]).includes(requested)) {
    chain.push(requested);
  }

  // 2) zh 作为默认 fallback（中文用户最多）
  if (!chain.includes('zh')) chain.push('zh');

  // 3) 剩余支持的 locale
  for (const l of PROJECT_LOCALES) {
    if (!chain.includes(l)) chain.push(l);
  }

  return chain;
}

/**
 * getLocalized —— 从 i18n 字段取 locale 对应值
 *
 * 支持输入：
 *   - 已是 string（已解析）→ 直接返回
 *   - 是对象 / 数组 → 按 locale 取
 *   - 是 JSON 字符串（DB 列格式）→ safeParse 后取
 *   - null / undefined → 返回 undefined（不返 fallback；让 caller 决定）
 *
 * 取值逻辑：
 *   1. 尝试请求的 locale
 *   2. 尝试 fallback chain 中的下一项
 *   3. 若都失败 → 返回 undefined（caller 应自行 fallback 到原 DB 值或默认）
 *
 * @param field   i18n 字段（任何形态）
 * @param locale  请求的 locale
 * @returns locale 对应的本地化字符串，或 undefined
 *
 * @example
 * ```ts
 * // DB 列格式（已 JSON.stringify）
 * const name = getLocalized(species.nameI18n, 'zh');
 * // → '金鱼'
 *
 * // 已解析的对象
 * const title = getLocalized({ zh: '喂食', en: 'Feed' }, 'en');
 * // → 'Feed'
 *
 * // DB 原始字符串（未 JSON 化）
 * const title = getLocalized('金鱼', 'zh');
 * // → '金鱼'
 *
 * // 所有 locale 都缺
 * const x = getLocalized({}, 'zh');
 * // → undefined
 * ```
 */
export function getLocalized(
  field: unknown,
  locale: string,
): string | undefined {
  if (field == null) return undefined;

  // 已是 string — 直接返回
  if (typeof field === 'string') {
    // 可能是 JSON 字符串，也可能是已解析的字面量
    // 用 safeParse 试一下；如果 parse 失败说明就是字面量
    const parsed = safeParse<string | Record<string, string>>(field, null as any);
    if (parsed === null) {
      // 不是 JSON — 当作 plain string 返回
      return field;
    }
    if (typeof parsed === 'string') {
      // 双层 JSON 编码（罕见）— 取内层
      return parsed;
    }
    // 是 object — 走下方 object 分支
    field = parsed as unknown;
  }

  // array — 异常格式，返回 undefined
  if (Array.isArray(field)) return undefined;

  // object — 按 locale 取
  if (typeof field === 'object') {
    const obj = field as Record<string, unknown>;
    const chain = localeFallbackChain(locale);

    for (const l of chain) {
      const v = obj[l];
      if (typeof v === 'string' && v.length > 0) return v;
    }

    // 链上所有 locale 都缺 — 看是否能取到任意非空 string
    for (const [, v] of Object.entries(obj)) {
      if (typeof v === 'string' && v.length > 0) return v;
    }

    return undefined;
  }

  // 其他类型（number / boolean / bigint）— 不支持
  return undefined;
}
