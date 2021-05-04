import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as tar from 'tar'
import * as utils from '@actions/utils'

async function getCacheFile(...paths: string[]): Promise<string | undefined> {
  for (const file of await (await glob.create(paths.join('\n'))).glob()) {
    if (utils.fileExist(file)) {
      return file
    }
  }
}

async function run(): Promise<void> {
  try {
    const savePath = utils.getInputAsString('save-path', {required: true})
    const loadPaths = utils.getInputAsArray('load-paths')

    core.startGroup('Load the cached asset')

    let cacheFile: string | undefined = savePath
    let primaryMatch = false

    if (utils.fileExist(cacheFile)) {
      core.debug('Cache hit on the primary path')
      primaryMatch = true
    } else {
      core.debug('Looking for asset cache on the secondary load paths')
      cacheFile = await getCacheFile(...loadPaths)
      if (!cacheFile) {
        core.debug('Cache miss')
        return
      }
    }

    await utils.waitForPathLock(cacheFile, 300000)

    if (!utils.pathIsOk(cacheFile)) {
      core.warning(`Failed to verify integrity of cache file "${cacheFile}"`)
      return
    }
    core.endGroup()

    core.startGroup('Extract cache file')
    core.info(`Extracting assets from file "${cacheFile}"`)
    try {
      tar.extract({
        sync: true,
        cwd: process.env['GITHUB_WORKSPACE'] ? process.env['GITHUB_WORKSPACE'] : process.cwd(),
        file: cacheFile,
        preservePaths: true
      })
    } catch (error) {
      if (error.code === 'TAR_BAD_ARCHIVE') {
        core.warning(`Failed to read cache file "${cacheFile}", ignoring cache hit`)
        return
      }
      // noinspection ExceptionCaughtLocallyJS
      throw error
    }
    core.endGroup()

    core.startGroup('Set output')
    core.setOutput('cache-file', cacheFile)

    if (primaryMatch) {
      core.setOutput('cache-hit', 'true')
      core.saveState('CACHE_HIT', 'true')
    }
    core.endGroup()
  } catch (error) {
    core.setFailed(error.message)
  }
}

void run()
