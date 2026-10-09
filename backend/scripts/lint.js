const fs = require("node:fs/promises");
const path = require("node:path");
const { ESLint } = require("eslint");
const prettier = require("prettier");
const root = path.resolve(__dirname, "..");
const ignored = new Set(["node_modules", ".git", "coverage"]);
async function collect(dir) {
  const output = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !ignored.has(entry.name))
      output.push(...(await collect(path.join(dir, entry.name))));
    else if (
      entry.isFile() &&
      /\.(js|json|md|yml|yaml)$/.test(entry.name) &&
      !entry.name.endsWith(".lock")
    )
      output.push(path.join(dir, entry.name));
  }
  return output;
}
(async () => {
  const files = await collect(root);
  const eslint = new ESLint({ cwd: root });
  const lintResults = await eslint.lintFiles(
    files.filter((file) => file.endsWith(".js")),
  );
  const lintOutput = await (
    await eslint.loadFormatter("stylish")
  ).format(lintResults);
  if (lintOutput) process.stdout.write(lintOutput);
  let failed = lintResults.some(
    (result) => result.errorCount || result.fatalErrorCount,
  );
  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    const options = { ...(await prettier.resolveConfig(file)), filepath: file };
    const formatted = await prettier.format(source, options);
    if (formatted !== source) {
      if (process.argv.includes("--format"))
        await fs.writeFile(file, formatted);
      else {
        process.stderr.write(`Prettier: ${path.relative(root, file)}\n`);
        failed = true;
      }
    }
  }
  if (failed) process.exitCode = 1;
})().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
