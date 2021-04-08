import * as core from '@actions/core'
import * as tar from 'tar'
import * as utils from '@actions/utils'

function run(): void {
  try {
    const localPath = utils.getInputAsArray('path', {required: true})
    const savePath = utils.getInputAsString('save-path', {required: true})
    const forceSave = utils.getInputAsBool('force-save')

    const cacheHit = core.getState('CACHE_HIT_PRIMARY')

    if (!forceSave) {
      if (cacheHit.toUpperCase() === 'TRUE') {
        core.info('Cache hit from primary key, skipping save to cache')
        process.exit()
      }

      if (utils.fileExist(savePath)) {
        core.setFailed(`Cache file "${savePath}" already exists`)
        process.exit(1)
      }
    }

    core.startGroup('Saving asset to cache')
    const releaseLock = utils.getPathLock(savePath)
    if (!releaseLock) {
      core.setFailed(`Failed to acquire lock for path "${savePath}"`)
      process.exit(1)
    }

    try {
      tar.create(
        {
          sync: true,
          cwd: process.env['GITHUB_WORKSPACE'] ? process.env['GITHUB_WORKSPACE'] : process.cwd(),
          file: savePath,
          preservePaths: true
        },
        localPath
      )
    } catch (error) {
      if (error.code === 'ENOENT') {
        core.warning(error)
      } else {
        releaseLock()
        // noinspection ExceptionCaughtLocallyJS
        throw error
      }
    }
    utils.okPath(savePath)

    releaseLock()
    core.endGroup()
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
