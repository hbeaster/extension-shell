// Shell-owned convenience tooling: builds every extension independently, then
// runs the assembler. Each extension is a standalone npm package — this script
// runs `npm ci && npm run build` inside each folder with its own lockfile, so
// no state is shared between extensions. Extensions never need this script;
// each one also builds on its own (`npm ci && npm run build` in its folder).
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { exists, findExtensions } from './discover.mjs'

const root = path.dirname(fileURLToPath(new URL('.', import.meta.url)))

// shell: true because npm is npm.cmd on Windows, which spawnSync cannot
// execute directly; the command is a fixed string, never user input.
function run(command, cwd) {
  const result = spawnSync(command, { cwd, stdio: 'inherit', shell: true })
  return result.status === 0
}

for (const { id, dir } of await findExtensions(root)) {
  if (!(await exists(path.join(dir, 'package-lock.json')))) {
    console.error(`${id}: missing package-lock.json — run npm install in extensions/${id} and commit the lockfile`)
    process.exit(1)
  }
  if (!run('npm ci', dir) || !run('npm run build', dir)) {
    console.error(`${id}: build failed`)
    process.exit(1)
  }
}

const assemble = spawnSync(process.execPath, [path.join(root, 'scripts', 'assemble.mjs')], { stdio: 'inherit' })
process.exit(assemble.status ?? 1)
