/* ──────────────────────────────────────────────
   存储工厂 — 根据环境变量创建适配器实例
   切换后端只需修改 DB_PROVIDER / STORAGE_PROVIDER

   注意：Turso 和 PostgreSQL 使用动态 import()，
   避免在默认 D1 模式下引入 Node.js 依赖导致
   Workers 编译失败。
   ────────────────────────────────────────────── */

import type { IDatabase } from "./interfaces";
import type { IObjectStorage } from "./interfaces";
import { D1Adapter } from "./db/d1";
import { R2Adapter } from "./object/r2";
import { S3Adapter } from "./object/s3";

/**
 * D1 baseline 校验结果缓存（模块 / isolate 作用域）。
 *
 * 作用机制与设计权衡：
 * 1. 作用域：WeakMap 以 D1 binding 对象为 key，生命周期自然绑定到当前 Workers isolate。
 *    当发布新版本部署（deployment）时，Cloudflare Workers 会创建新的 isolate，
 *    代码和全局变量自然重置，因此 schema 校验天然与部署版本同生命周期，无需人工失效。
 * 2. 单飞（Single-Flight）：针对同一 D1 binding 并发到来的请求，复用同一个 In-Flight Promise，
 *    避免并发请求时重复执行 18 条基线校验 SQL。
 * 3. 错误重试：若校验失败（如缺表/缺列/网络异常），在 catch 中将缓存项清除，
 *    保证后续请求可以重试，而不是永远抛出旧错误。
 * 4. 绑定隔离：不同 D1 binding 对象具有不同的对象引用，在 WeakMap 中互相独立，
 *    避免多库/多租户场景误复用。
 * 5. 局限性：
 *    - 依赖 D1 binding 的对象引用标识（identity）。若调用方每次传入全新的 object 包装，
 *      则缓存退化为每次重新校验（安全且不破坏正确性）。
 *    - 若在不重启 isolate 的情况下由外部直接执行了 DDL（非部署触发），已缓存的 isolate 不会感知；
 *      生产 schema 迁移后应重新部署以刷新缓存，不应为此开启运行时自动迁移。
 * 6. AUTO_SCHEMA_MIGRATION=true 时不走此只读基线缓存，仍按原有逻辑调用 ensureSchema()。
 */
const d1BaselineCache = new WeakMap<object, Promise<void>>();

async function ensureD1BaselineCached(d1Adapter: D1Adapter, dbBinding: object): Promise<void> {
  const cached = d1BaselineCache.get(dbBinding);
  if (cached) {
    return cached;
  }

  const checkPromise = (async () => {
    await d1Adapter.ensureSchemaBaseline();
  })();

  d1BaselineCache.set(dbBinding, checkPromise);

  try {
    await checkPromise;
  } catch (error) {
    if (d1BaselineCache.get(dbBinding) === checkPromise) {
      d1BaselineCache.delete(dbBinding);
    }
    throw error;
  }
}

/**
 * 创建数据库适配器
 * 支持的 DB_PROVIDER: 'd1' (默认) | 'turso' | 'postgres'
 */
export async function createDatabase(env: Record<string, unknown>): Promise<IDatabase> {
  const provider = (env.DB_PROVIDER as string) || "d1";
  const autoSchemaMigration = env.AUTO_SCHEMA_MIGRATION === "true";

  switch (provider) {
    case "d1": {
      if (!env.DB) throw new Error("缺少 D1 数据库绑定 (env.DB)");
      const d1Adapter = new D1Adapter(env.DB as D1Database);
      if (autoSchemaMigration) {
        await d1Adapter.ensureSchema();
      } else {
        await ensureD1BaselineCached(d1Adapter, env.DB as object);
      }
      return d1Adapter;
    }

    case "turso": {
      const url = env.TURSO_URL as string;
      const authToken = env.TURSO_AUTH_TOKEN as string;

      if (!url) {
        throw new Error("Turso 配置不完整，需要设置: TURSO_URL（可选: TURSO_AUTH_TOKEN）");
      }

      const { TursoAdapter } = await import("./db/turso");
      const adapter = new TursoAdapter(url, authToken);
      await adapter.ensureCoreTables();
      return adapter;
    }

    case "postgres": {
      const connectionString = env.DATABASE_URL as string;

      if (!connectionString) {
        throw new Error(
          "PostgreSQL 配置不完整，需要设置: DATABASE_URL (如 postgres://user:pass@host:5432/dbname)"
        );
      }

      const { PostgresAdapter } = await import("./db/postgres");
      const adapter = new PostgresAdapter(connectionString);
      await adapter.ensureCoreTables();
      return adapter;
    }

    default:
      throw new Error(`不支持的数据库提供者: ${provider}。可选值: d1, turso, postgres`);
  }
}

/**
 * 创建对象存储适配器
 * 支持的 STORAGE_PROVIDER: 'r2' (默认) | 's3'
 *
 * S3 兼容厂商配置示例：
 *  - AWS S3:       S3_ENDPOINT=https://s3.amazonaws.com
 *  - Backblaze B2: S3_ENDPOINT=https://s3.us-west-002.backblazeb2.com
 *  - 阿里云 OSS:   S3_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
 *  - 腾讯云 COS:   S3_ENDPOINT=https://cos.ap-guangzhou.myqcloud.com
 */
export function createObjectStorage(env: Record<string, unknown>): IObjectStorage {
  const provider = (env.STORAGE_PROVIDER as string) || "r2";

  switch (provider) {
    case "r2":
      if (!env.BUCKET) throw new Error("缺少 R2 存储桶绑定 (env.BUCKET)");
      return new R2Adapter(env.BUCKET as R2Bucket);

    case "s3": {
      const endpoint = env.S3_ENDPOINT as string;
      const accessKey = env.S3_ACCESS_KEY as string;
      const secretKey = env.S3_SECRET_KEY as string;
      const bucket = env.S3_BUCKET_NAME as string;

      if (!endpoint || !accessKey || !secretKey || !bucket) {
        throw new Error(
          "S3 配置不完整，需要设置: S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET_NAME"
        );
      }

      return new S3Adapter({
        endpoint,
        accessKey,
        secretKey,
        bucket,
        region: (env.S3_REGION as string) || "auto",
        publicUrl: env.S3_PUBLIC_URL as string | undefined,
      });
    }

    default:
      throw new Error(`不支持的存储提供者: ${provider}。可选值: r2, s3`);
  }
}
