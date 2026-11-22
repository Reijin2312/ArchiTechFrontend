import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(process.cwd(), 'dist-ssg')

async function visit(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  await Promise.all(entries.map(async entry => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return visit(path)
    if (!entry.isFile() || !entry.name.endsWith('.js')) return

    const source = await readFile(path, 'utf8')
    const stripped = source.replace(/^import\s+["'][^"']+\.css["'];?\s*$/gm, '')
    if (stripped !== source) await writeFile(path, stripped, 'utf8')
  }))
}

await visit(root)
