// Assembles built extensions into extensions/dist/:
//   dist/registry.json            merged manifest list consumed by the shell
//   dist/<id>/<id>.js             web-component bundle
//   dist/<id>/icon.svg            sidebar icon
// Run after `npm run build --workspaces` (the root `npm run build` does both).
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(fileURLToPath(new URL('.', import.meta.url)))
const distRoot = path.join(root, 'dist')

async function exists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

const entries = []
for (const dirent of await readdir(root, { withFileTypes: true })) {
  if (!dirent.isDirectory()) continue
  const manifestPath = path.join(root, dirent.name, 'extension.json')
  if (!(await exists(manifestPath))) continue

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const { id, name, tag } = manifest
  if (!id || !name || !tag) {
    throw new Error(`${manifestPath}: manifest must define id, name, and tag`)
  }
  if (id !== dirent.name) {
    throw new Error(`${manifestPath}: id "${id}" must match folder name "${dirent.name}"`)
  }
  if (!tag.startsWith('ext-')) {
    throw new Error(`${manifestPath}: tag "${tag}" must start with "ext-" to avoid collisions`)
  }
  entries.push({ id, name, tag, dir: path.join(root, dirent.name) })
}

for (const key of ['id', 'tag']) {
  const seen = new Set()
  for (const entry of entries) {
    if (seen.has(entry[key])) {
      throw new Error(`Duplicate extension ${key} "${entry[key]}"`)
    }
    seen.add(entry[key])
  }
}

await rm(distRoot, { recursive: true, force: true })
await mkdir(distRoot, { recursive: true })

const registry = []
for (const entry of entries.sort((a, b) => a.id.localeCompare(b.id))) {
  const bundle = path.join(entry.dir, 'dist', `${entry.id}.js`)
  const icon = path.join(entry.dir, 'icon.svg')
  for (const required of [bundle, icon]) {
    if (!(await exists(required))) {
      throw new Error(`${entry.id}: missing ${required} — run the extension build first`)
    }
  }
  const outDir = path.join(distRoot, entry.id)
  await mkdir(outDir, { recursive: true })
  await cp(bundle, path.join(outDir, `${entry.id}.js`))
  await cp(icon, path.join(outDir, 'icon.svg'))
  registry.push({
    id: entry.id,
    name: entry.name,
    tag: entry.tag,
    module: `/extensions/${entry.id}/${entry.id}.js`,
    icon: `/extensions/${entry.id}/icon.svg`,
  })
}

await writeFile(path.join(distRoot, 'registry.json'), JSON.stringify({ extensions: registry }, null, 2) + '\n')
console.log(`Assembled ${registry.length} extension(s) into ${distRoot}`)
