import Keyv from 'keyv'
import KeyvSqlite from '@keyv/sqlite'
import KeyvGzip from '@keyv/compress-gzip'
import fs from 'fs'
import assert from 'assert'

import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const databaseFolderPath = path.join(__dirname, '..', 'data')
const databasePath = path.join(databaseFolderPath, 'database.sqlite')

const day = 1000 * 60 * 60 * 24
let keyv

const initDatabase = async () => {
  if (keyv) {
    return
  }
  try {
    fs.mkdirSync(databaseFolderPath)
  }
  catch (e) {}

  keyv = new Keyv({
    store: new KeyvSqlite(`sqlite://${databasePath}`), 
    ttl: day, 
    compression: new KeyvGzip()
  })
}

const addProviders = async (providers) => {
  await initDatabase()

  const cids = {}
  for (const provider of providers) {
    for (const key of provider.Payload.Keys) {
      if (!cids[key]) {
        cids[key] = []
      }
      cids[key].push(provider)
    }
  }

  // add providers to db for each cid
  const promises = []
  for (const cid in cids) {
    promises.push(addCidProvidersToDatabase(cid, cids[cid])) 
  }
  await Promise.all(promises)
}

const addCidProvidersToDatabasePending = {}
const addCidProvidersToDatabase = async (cid, providers) => {
  assert(cid && typeof cid === 'string', `database.addCidProvidersToDatabase cid '${cid}' not a string`)
  assert(Array.isArray(providers), `database.addCidProvidersToDatabase cid '${cid}' providers '${providers}' not an array`)

  // don't update the same cid at the same time or could lose data
  while (addCidProvidersToDatabasePending[cid]) {
    await new Promise(r => setTimeout(r, 5))
  }
  addCidProvidersToDatabasePending[cid] = true

  const nextProviders = await keyv.get(cid) || {}
  for (const provider of providers) {
    nextProviders[provider.Payload.ID] = {
      Schema: 'peer',
      Addrs: provider.Payload.Addrs,
      ID: provider.Payload.ID,
      Protocols: [provider.Protocol]
    }
  }
  await keyv.set(cid, nextProviders)

  delete addCidProvidersToDatabasePending[cid]
}

const getProviders = async (cid) => {
  assert(cid && typeof cid === 'string', `database.getProviders cid '${cid}' not a string`)
  await initDatabase()

  const providers = await keyv.get(cid)
  const providersArray = []
  for (const providerId in providers) {
    providersArray.push(providers[providerId])
  }
  return providersArray
}

const database = {
  // public
  addProviders,
  getProviders,

  // for testing
  clear: () => keyv.clear(),
  memory: () => {
    keyv = new Keyv({
      store: new KeyvSqlite('sqlite://:memory:'), 
      ttl: day
    })
  },

  // private
  _private: {
    addCidProvidersToDatabase
  }
}

export default database
