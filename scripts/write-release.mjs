// 构建完成后写入提交与文件摘要，便于部署端核对实际产物。
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const files = {}
function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) visit(path)
    else if (entry.name !== 'release.json') {
      files[relative('dist', path).replaceAll('\\', '/')] = createHash('sha256')
        .update(readFileSync(path)).digest('hex')
    }
  }
}
visit('dist')
writeFileSync('dist/release.json', JSON.stringify({
  revision: git('rev-parse', 'HEAD'),
  dirty: Boolean(git('status', '--porcelain', '--untracked-files=no')),
  files
}, null, 2) + '\n')
