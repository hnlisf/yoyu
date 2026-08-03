/**
 * ============================================================================
 * 文件名：common/validators/text.ts（自由文本字段校验器）
 * ============================================================================
 * 作用：消除散落在 backend/src/** 的 3 处 nickName 校验重复实现
 *
 * 为什么需要这个文件？
 *   - 之前 fish.service.ts:140-158 + :273-292 + fish-tanks.service.ts:251-270
 *     三处各自实现：长度 + emoji + HTML 标签
 *   - 任何修改（比如放宽 emoji 检查）需要同步 3 处 → 漏改风险
 *   - harness.yaml → policies.jsonb 之类不直接管这个，但
 *     ref-check.ts 的 PR 1 baseline 已识别 → 后续 P3 Refactor 必修
 *
 * 设计原则：
 *   - 单一来源（single source of truth）
 *   - 返回 ErrorCode enum（caller 决定怎么翻译成本地化消息）
 *   - 严格类型（不让 caller 猜）
 *   - 易测试（pure function，无 NestJS 依赖）
 *
 * 替换路线（SPEC §1.2）：
 *   fish.service.ts:140-158    create() 中 nickname 校验
 *   fish.service.ts:273-292    renameFish() 中 nickname 校验
 *   fish-tanks.service.ts:251-270  FishTanksService.renameFish() 中
 * ============================================================================
 */

/**
 * nickname 校验返回的错误码
 *
 * 设计：string enum 而非 throw，便于 caller 决定：
 *   - HTTP API → 转 400 + i18n 错误消息
 *   - CLI → 转 stderr 文案
 *   - 测试 → 直接断言
 */
export enum NicknameErrorCode {
  OK = 'OK',
  EMPTY = 'NICKNAME_EMPTY',
  TOO_LONG = 'NICKNAME_TOO_LONG',
  HAS_EMOJI = 'NICKNAME_HAS_EMOJI',
  HAS_HTML = 'NICKNAME_HAS_HTML',
}

/**
 * 校验结果
 * - ok: true + 无 error → 校验通过
 * - ok: false + code + message (English) → 校验失败；caller 决定 i18n
 */
export interface ValidationResult {
  ok: boolean;
  code: NicknameErrorCode;
  message?: string;
}

// ── 配置常量（单点维护） ──
export const NICKNAME_MAX_LENGTH = 20;
const EMOJI_REGEX = /\p{Extended_Pictographic}/u;
const HTML_TAG_REGEX = /<[^>]*>/;
const WHITESPACE_ONLY_REGEX = /^\s*$/;

/**
 * validateNickname —— 校验用户输入的昵称
 *
 * 规则（按检查顺序）：
 *   1. 非空（trim 后）
 *   2. 长度 ≤ 20
 *   3. 不含 emoji（鱼类昵称应可读）
 *   4. 不含 HTML 标签（防 XSS）
 *
 * @param raw 用户输入
 * @returns ValidationResult
 *
 * @example
 * ```ts
 * const r = validateNickname('金鱼');
 * if (!r.ok) throw new BadRequestException(r.message);
 *
 * // 测试
 * expect(validateNickname('').code).toBe(NicknameErrorCode.EMPTY);
 * expect(validateNickname('🐟').code).toBe(NicknameErrorCode.HAS_EMOJI);
 * ```
 */
export function validateNickname(raw: unknown): ValidationResult {
  // 非字符串 / null / undefined — 当作空
  if (typeof raw !== 'string') {
    return { ok: false, code: NicknameErrorCode.EMPTY, message: 'Nickname must be a string' };
  }

  // 纯空白符 — 视为空
  if (WHITESPACE_ONLY_REGEX.test(raw)) {
    return { ok: false, code: NicknameErrorCode.EMPTY, message: 'Nickname cannot be empty' };
  }

  // trim 后再用
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return { ok: false, code: NicknameErrorCode.EMPTY, message: 'Nickname cannot be empty' };
  }

  if (trimmed.length > NICKNAME_MAX_LENGTH) {
    return {
      ok: false,
      code: NicknameErrorCode.TOO_LONG,
      message: `Nickname cannot exceed ${NICKNAME_MAX_LENGTH} characters`,
    };
  }

  if (EMOJI_REGEX.test(trimmed)) {
    return {
      ok: false,
      code: NicknameErrorCode.HAS_EMOJI,
      message: 'Nickname cannot contain emoji',
    };
  }

  if (HTML_TAG_REGEX.test(trimmed)) {
    return {
      ok: false,
      code: NicknameErrorCode.HAS_HTML,
      message: 'Nickname cannot contain HTML tags',
    };
  }

  return { ok: true, code: NicknameErrorCode.OK };
}
