import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const dir = await mkdtemp(join(tmpdir(), "order-access-"));
const localDir = await mkdtemp(resolve("node_modules/.order-access-"));
const harness = resolve("test/order-access-harness.ts");
try {
  await build({
    entryPoints: ["test/order-access.test.ts"],
    outfile: join(dir, "order-access.test.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    plugins: [{
      name: "test-boundaries",
      setup(build) {
        build.onResolve({ filter: /^@workspace\/api-zod$/ }, () => ({ path: resolve("../../lib/api-zod/src/index.ts") }));
        build.onResolve({ filter: /^zod$/ }, () => ({ path: resolve("../../lib/api-zod/node_modules/zod/index.js") }));
        build.onResolve({ filter: /^zod\/v4$/ }, () => ({ path: resolve("../../lib/api-zod/node_modules/zod/v4/index.js") }));
        build.onResolve({ filter: /^drizzle-zod$/ }, () => ({ path: resolve("../../lib/db/node_modules/drizzle-zod/index.mjs") }));
        build.onResolve({ filter: /^@workspace\/db$/ }, () => ({ path: "db", namespace: "test-double" }));
        build.onResolve({ filter: /\/lib\/auth$/ }, () => ({ path: "auth", namespace: "test-double" }));
        build.onResolve({ filter: /\/lib\/marketplaceOrders$/ }, () => ({ path: "orders", namespace: "test-double" }));
        build.onLoad({ filter: /.*/, namespace: "test-double" }, ({ path }) => ({
          contents: path === "db"
            ? `export * from ${JSON.stringify(resolve("../../lib/db/src/schema/index.ts"))}; export { db } from ${JSON.stringify(harness)};`
            : `export { ${path === "auth" ? "getRequestSession" : "loadBuyerOrder, tokenMatches, listAdminOrders, listSellerOrders, loadSellerOrder"} } from ${JSON.stringify(harness)};`,
          loader: "ts",
          resolveDir: process.cwd(),
        }));
      },
    }],
  });
  // External dependencies resolve from the artifact, not the OS temp directory.
  const local = join(localDir, "order-access.test.mjs");
  const { copyFile } = await import("node:fs/promises");
  await copyFile(join(dir, "order-access.test.mjs"), local);
  const result = spawnSync(process.execPath, ["--test", local], { stdio: "inherit", env: { ...process.env, NODE_ENV: "production" } });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(localDir, { recursive: true, force: true });
  await rm(dir, { recursive: true, force: true });
}