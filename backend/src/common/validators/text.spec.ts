/**
 * 文件名：text.spec.ts —— nickname validator 单元测试
 *
 * 设计：纯函数测试，无 NestJS 依赖，零 mock
 *
 * 覆盖率目标：≥95%（SPEC AC-1.2.2）
 */

import {
  validateNickname,
  NicknameErrorCode,
  NICKNAME_MAX_LENGTH,
} from './text';

describe('validateNickname', () => {
  describe('empty input', () => {
    it('should reject empty string', () => {
      expect(validateNickname('').code).toBe(NicknameErrorCode.EMPTY);
    });
    it('should reject whitespace-only', () => {
      expect(validateNickname('   ').code).toBe(NicknameErrorCode.EMPTY);
      expect(validateNickname('\t\n  ').code).toBe(NicknameErrorCode.EMPTY);
    });
    it('should reject null', () => {
      expect(validateNickname(null as unknown).code).toBe(NicknameErrorCode.EMPTY);
    });
    it('should reject undefined', () => {
      expect(validateNickname(undefined as unknown).code).toBe(NicknameErrorCode.EMPTY);
    });
    it('should reject non-string', () => {
      expect(validateNickname(42 as unknown).code).toBe(NicknameErrorCode.EMPTY);
    });
  });

  describe('length', () => {
    it(`should accept exactly ${NICKNAME_MAX_LENGTH} chars`, () => {
      const name = 'a'.repeat(NICKNAME_MAX_LENGTH);
      expect(validateNickname(name).ok).toBe(true);
    });
    it(`should reject ${NICKNAME_MAX_LENGTH + 1} chars`, () => {
      const name = 'a'.repeat(NICKNAME_MAX_LENGTH + 1);
      expect(validateNickname(name).code).toBe(NicknameErrorCode.TOO_LONG);
    });
    it('should accept Chinese chars (each is 1 char)', () => {
      const name = '我的小金鱼';  // 5 chars
      expect(validateNickname(name).ok).toBe(true);
    });
  });

  describe('emoji', () => {
    it('should reject emoji', () => {
      expect(validateNickname('小🐟鱼').code).toBe(NicknameErrorCode.HAS_EMOJI);
    });
    it('should accept text without emoji', () => {
      expect(validateNickname('小金鱼').ok).toBe(true);
    });
  });

  describe('HTML', () => {
    it('should reject HTML tags', () => {
      expect(validateNickname('<script>').code).toBe(NicknameErrorCode.HAS_HTML);
      expect(validateNickname('hello<b>').code).toBe(NicknameErrorCode.HAS_HTML);
    });
    it('should accept text without HTML', () => {
      expect(validateNickname('hello').ok).toBe(true);
    });
  });

  describe('happy path', () => {
    it('should accept typical nickname', () => {
      const r = validateNickname('金鱼');
      expect(r.ok).toBe(true);
      expect(r.code).toBe(NicknameErrorCode.OK);
      expect(r.message).toBeUndefined();
    });
    it('should trim whitespace then validate', () => {
      expect(validateNickname('  金鱼  ').ok).toBe(true);
    });
  });
});
