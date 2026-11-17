// An Astro integration that writes THIRD_PARTY_LICENSES.txt at the site root: the licence and
// notice files of every npm package whose code the site ships (the client build's scripts, and
// the stylesheets and fonts any build extracts), plus `extra` packages a later build step copies
// in. A shipped package without a licence file fails the build.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const NOTICE_FILE = /^(?:licen[cs]e|copying|notice)(?:[._-].*)?$/i
const LICENSE_FILE = /^(?:licen[cs]e|copying)(?:[._-].*)?$/i

function packageDir(id) {
  const match = /^(.*\/node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(id.replace(/^\0/, '').split('?')[0])
  return match ? match[1] : null
}

/** The licence and notice files in `dir`, including those in a LICENSE/ folder. */
function noticeFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => NOTICE_FILE.test(entry.name))
    .flatMap((entry) => entry.isDirectory()
      ? readdirSync(join(dir, entry.name)).sort().map((name) => join(entry.name, name))
      : [entry.name])
    .sort()
}

function section(dir, licenseFrom) {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  let source = dir
  let files = noticeFiles(dir)
  if (!files.some((name) => LICENSE_FILE.test(basename(name))) && licenseFrom[pkg.name]) {
    source = licenseFrom[pkg.name]
    files = noticeFiles(source)
  }
  if (!files.some((name) => LICENSE_FILE.test(basename(name)))) throw new Error(`${pkg.name}@${pkg.version} ships no license file`)
  const texts = [...new Set(files.map((name) => readFileSync(join(source, name), 'utf8').trim()))]
  return [`${pkg.name}@${pkg.version}`, `${pkg.name} ${pkg.version} (${pkg.license ?? 'see the license text'})\n\n${texts.join('\n\n')}`]
}

/**
 * @param {{ extra?: string[], licenseFrom?: Record<string, string> }} [options] `extra`: packages
 *   added after bundling, by name; `licenseFrom`: for a package that publishes no licence file,
 *   the package of the same project whose licence files apply
 */
export function thirdPartyLicenses({ extra = [], licenseFrom = {} } = {}) {
  const dirs = new Set()
  let root = process.cwd()
  return {
    name: 'third-party-licenses',
    hooks: {
      'astro:config:setup': ({ config, updateConfig }) => {
        root = fileURLToPath(config.root)
        updateConfig({
          vite: {
            plugins: [{
              name: 'third-party-licenses',
              apply: 'build',
              generateBundle(_options, bundle) {
                // The client build ships its scripts to the browser; the server build only
                // prerenders, but the stylesheets (and the fonts they load) it extracts ship too.
                const client = this.environment?.name === 'client'
                for (const output of Object.values(bundle)) {
                  for (const id of Object.keys(output.modules ?? {})) {
                    if (!client && !/\.(?:css|scss|sass|less)(?:\?|$)/.test(id)) continue
                    const dir = packageDir(id)
                    if (dir) dirs.add(dir)
                  }
                }
              },
            }],
          },
        })
      },
      'astro:build:done': ({ dir }) => {
        // A package's folder, found as Node finds it: node_modules/<name> here or in a parent folder.
        const packageRoot = (name) => {
          for (let folder = root; ; folder = dirname(folder)) {
            if (existsSync(join(folder, 'node_modules', name, 'package.json'))) return join(folder, 'node_modules', name)
            if (dirname(folder) === folder) throw new Error(`${name} is not installed`)
          }
        }
        for (const name of extra) dirs.add(packageRoot(name))
        const sources = Object.fromEntries(Object.entries(licenseFrom).map(([name, from]) => [name, packageRoot(from)]))
        const sections = new Map([...dirs].filter((entry) => existsSync(join(entry, 'package.json'))).map((entry) => section(entry, sources)))
        const body = [...sections].sort(([a], [b]) => a.localeCompare(b)).map(([, text]) => `${'-'.repeat(72)}\n${text}\n`)
        writeFileSync(join(fileURLToPath(dir), 'THIRD_PARTY_LICENSES.txt'), `Third-party licenses\n\nThis site's scripts and styles include code from the packages below, each under its own license.\n\n${body.join('\n')}`)
      },
    },
  }
}
