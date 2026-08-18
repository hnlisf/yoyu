/**
 * ============================================================================
 * 文件名：common/repository/base.repository.ts（通用仓储基类）
 * ============================================================================
 * 作用：消除 service 层直接用 `prisma.{model}.xxx()` 的 13 模块横向耦合
 *
 * 为什么需要？
 *   - 之前 13 个模块各自 import PrismaService，直接 prisma.user.upsert 等
 *   - UserService.getFishSummary 直接读 Prisma 跨进 PreferencesService 领域
 *   - service 之间"通过数据库共享状态"——隐式耦合
 *
 * 设计目标：
 *   - BaseRepository<T> 封装 CRUD 样板
 *   - 子类按领域语义封装查询方法
 *   - 子类之间通过 service-to-service 调用，不直接拿对方 Prisma
 *
 * 设计取舍：
 *   - 用 Generic class（不是抽象方法集）—— JS 运行时用不上抽象检查，但 IDE 能给类型
 *   - 不引入 MikroORM/TypeORM 等重 ORM 风格——Prisma 够用
 *   - 不强制所有 service 用——只迁移已有跨模块直接 prisma 调用的（如 UserService→Preferences）
 *
 * 设计原则（外部 spec 适用——本类不强制）：
 *   - service 单向依赖：Controller → Service → Repository → PrismaService
 *   - service-to-service 调用通过 @Injectable 服务（不是直接 prisma.x）
 *   - 单元测试可 mock Repository，不必 mock prisma
 *
 * 测试模式（见 base.repository.spec.ts）：
 *   - mock PrismaService → 直接验证参数和返回值
 * ============================================================================
 */

import { PrismaService } from '../../prisma/prisma.service';

/**
 * BaseRepository — 通用 CRUD 包装基类
 *
 * 子类通过 extends 获得基础 CRUD + 添加领域方法：
 *
 * @example
 * ```ts
 * // preferences.repository.ts
 * @Injectable()
 * export class PreferencesRepository extends BaseRepository<UserPreference> {
 *   constructor(prisma: PrismaService) {
 *     super(prisma, prisma.userPreference);
 *   }
 *
 *   async findByUser(userId: string): Promise<UserPreference | null> {
 *     return this.findUnique({ userId });
 *   }
 *
 *   async toggleFavorite(userId: string, speciesId: string): Promise<string[]> {
 *     // 领域方法
 *   }
 * }
 * ```
 */
export class BaseRepository<TModel, TWhere = unknown> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelAccessor: {
      findMany: (args?: { where?: TWhere; orderBy?: unknown; take?: number; skip?: number }) => Promise<TModel[]>;
      findUnique: (args: { where: TWhere }) => Promise<TModel | null>;
      create: (args: { data: unknown }) => Promise<TModel>;
      update: (args: { where: TWhere; data: unknown }) => Promise<TModel>;
      updateMany: (args: { where: TWhere; data: unknown }) => Promise<{ count: number }>;
      upsert: (args: { where: TWhere; create: unknown; update: unknown }) => Promise<TModel>;
      delete: (args: { where: TWhere }) => Promise<TModel>;
      deleteMany: (args: { where: TWhere }) => Promise<{ count: number }>;
    },
  ) {}

  /** find many with optional filter, order, limit */
  async findMany(where?: TWhere, opts?: { orderBy?: unknown; take?: number; skip?: number }): Promise<TModel[]> {
    return this.modelAccessor.findMany({ where, ...opts });
  }

  /** find unique — returns null if not found */
  async findUnique(where: TWhere): Promise<TModel | null> {
    return this.modelAccessor.findUnique({ where });
  }

  /** create a new record */
  async create(data: unknown): Promise<TModel> {
    return this.modelAccessor.create({ data });
  }

  /** update existing record */
  async update(where: TWhere, data: unknown): Promise<TModel> {
    return this.modelAccessor.update({ where, data });
  }

  /** update many — returns count */
  async updateMany(where: TWhere, data: unknown): Promise<{ count: number }> {
    return this.modelAccessor.updateMany({ where, data });
  }

  /** upsert (create or update) */
  async upsert(where: TWhere, create: unknown, update?: unknown): Promise<TModel> {
    return this.modelAccessor.upsert({ where, create, update: update ?? create });
  }

  /** delete one record */
  async delete(where: TWhere): Promise<TModel> {
    return this.modelAccessor.delete({ where });
  }

  /** delete many records — returns count */
  async deleteMany(where: TWhere): Promise<{ count: number }> {
    return this.modelAccessor.deleteMany({ where });
  }
}
