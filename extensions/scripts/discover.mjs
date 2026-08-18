// Shared discovery for the two shell-owned packaging scripts. An extension is
// any folder whose package.json carries a "bc-extension" section — there is no
// separate manifest file and no allowlist.
//
// Build time is strict: unreadable or malformed JSON is a hard error here.
// The shell's runtime scan is deliberately the opposite — it skips a bad folder
// and serves the rest — because by then a deployer, not an author, owns the
// directory.
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

// Folders that live alongside the extensions and never are one.
const IGNORED_DIRS = new Set(['dist', 'scripts', 'node_modules'])

export async function exists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

// Returns [{ id, pkg, dir }] sorted by id. `id` is the folder name — it is the
// URL segment (/extensions/<id>/), the shell route (/ext/<id>), and the only
// identity an extension has. Folder names are unique by construction, so
// nothing has to enforce it.
export async function findExtensions(root) {
  const found = []
  for (const dirent of await readdir(root, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue
    if (IGNORED_DIRS.has(dirent.name) || dirent.name.startsWith('.')) continue

    const dir = path.join(root, dirent.name)
    const packagePath = path.join(dir, 'package.json')
    if (!(await exists(packagePath))) continue

    let pkg
    try {
      pkg = JSON.parse(await readFile(packagePath, 'utf8'))
    } catch (cause) {
      throw new Error(`${packagePath}: not valid JSON`, { cause })
    }
    if (pkg['bc-extension']) found.push({ id: dirent.name, pkg, dir })
  }
  return found.sort((a, b) => a.id.localeCompare(b.id))
}
