// Assembles built extensions into extensions/dist/, one folder per extension:
//   dist/<id>/package.json        name, version, and the bc-extension section
//   dist/<id>/extension.js        web-component bundle (bc-extension.module)
//   dist/<id>/icon.svg            sidebar icon (bc-extension.icon)
// There is no registry: the folder contents are the configuration, and the
// shell discovers extensions by scanning this tree (ADR 0012).
//
// Shell-owned packaging step: run after each extension has been built
// independently (`npm ci && npm run build` in its own folder), or use
// `scripts/build-all.mjs` to do both.
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { exists, findExtensions } from './discover.mjs'

const root = path.dirname(fileURLToPath(new URL('.', import.meta.url)))
const distRoot = path.join(root, 'dist')

// The shell hosts custom elements and nothing else yet; other types (iFrame is
// the expected next one) would be omitted at runtime, so reject them here where
// the author can still see the error.
const SUPPORTED_TYPE = 'WebComponent'

// module and icon name a file inside the extension's own folder. A path
// separator or a .. segment would let a manifest aim the shell's dynamic
// import at some other URL entirely.
function assertPlainFileName(id, field, value) {
  if (path.basename(value) !== value || value === '.' || value === '..' || /[\\/:]/.test(value)) {
    throw new Error(`${id}: bc-extension.${field} "${value}" must be a plain file name inside the extension folder`)
  }
}

const entries = []
for (const { id, pkg, dir } of await findExtensions(root)) {
  const manifest = pkg['bc-extension']
  const where = `extensions/${id}/package.json`

  if (!pkg.name || !pkg.version) {
    throw new Error(`${where}: must define a top-level name and version — the shell surfaces both`)
  }
  if (manifest.type !== SUPPORTED_TYPE) {
    throw new Error(`${where}: bc-extension.type must be "${SUPPORTED_TYPE}" (got ${JSON.stringify(manifest.type)})`)
  }
  if (typeof manifest.tag !== 'string' || !manifest.tag.startsWith('ext-')) {
    throw new Error(`${where}: bc-extension.tag must start with "ext-" to avoid collisions`)
  }

  const module = manifest.module ?? 'extension.js'
  const icon = manifest.icon ?? 'icon.svg'
  assertPlainFileName(where, 'module', module)
  assertPlainFileName(where, 'icon', icon)

  entries.push({ id, pkg, dir, tag: manifest.tag, manifest, module, icon })
}

// Folder names — and therefore ids — are unique by construction. Tags are not:
// two independently authored extensions can pick the same custom-element name,
// and only the deployer assembling them can see the conflict.
const seenTags = new Set()
for (const entry of entries) {
  if (seenTags.has(entry.tag)) {
    throw new Error(`Packaging conflict: two installed extensions share tag "${entry.tag}" — the deployer must resolve which one ships`)
  }
  seenTags.add(entry.tag)
}

await rm(distRoot, { recursive: true, force: true })
await mkdir(distRoot, { recursive: true })

for (const entry of entries) {
  const bundle = path.join(entry.dir, 'dist', entry.module)
  const icon = path.join(entry.dir, entry.icon)
  for (const required of [bundle, icon]) {
    if (!(await exists(required))) {
      throw new Error(`${entry.id}: missing ${required} — build the extension in its own folder (npm ci && npm run build) before assembling`)
    }
  }

  const outDir = path.join(distRoot, entry.id)
  await mkdir(outDir, { recursive: true })
  await cp(bundle, path.join(outDir, entry.module))
  await cp(icon, path.join(outDir, entry.icon))

  // The shipped package.json is trimmed, not copied: it becomes publicly
  // fetchable at /extensions/<id>/package.json, and devDependencies, scripts
  // and repo internals have no business being served. bc-extension goes across
  // verbatim — the shell applies the defaults, so nothing is baked in here.
  const shipped = { name: entry.pkg.name, version: entry.pkg.version, 'bc-extension': entry.manifest }
  await writeFile(path.join(outDir, 'package.json'), JSON.stringify(shipped, null, 2) + '\n')
}

console.log(`Assembled ${entries.length} extension(s) into ${distRoot}`)
