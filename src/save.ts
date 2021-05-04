import * as core from '@actions/core'
import * as fs from 'fs'
import * as tar from 'tar'
import * as utils from '@actions/utils'

function run(): void {
  let releaseLock: (() => void) | undefined

  try {
    const localPath = utils.getInputAsArray('path', {required: true})
    const savePath = utils.getInputAsString('save-path', {required: true})
    const forceSave = utils.getInputAsBool('force-save')

    const cacheHit = core.getState('CACHE_HIT')

    if (cacheHit.toUpperCase() === 'TRUE' && !forceSave) {
      core.info('Cache hit from primary key, skipping save to cache')
      return
    }

    releaseLock = utils.getPathLock(savePath)
    if (!releaseLock) {
      // noinspection ExceptionCaughtLocallyJS
      throw new Error(`Failed to acquire lock for path "${savePath}"`)
    }

    if (utils.fileExist(savePath) && utils.pathIsOk(savePath) && !forceSave) {
      // noinspection ExceptionCaughtLocallyJS
      throw new Error(`Cache file "${savePath}" already exists`)
    }

    core.startGroup('Saving asset to cache')
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
      utils.okPath(savePath)
    } catch (error) {
      fs.unlinkSync(savePath)

      if (error.code === 'ENOENT') {
        core.warning(error)
        return
      } else {
        // noinspection ExceptionCaughtLocallyJS
        throw error
      }
    }
    core.endGroup()
  } catch (error) {
    core.setFailed(error.message)
  } finally {
    if (releaseLock) {
      releaseLock()
    }
  }
}

run()
