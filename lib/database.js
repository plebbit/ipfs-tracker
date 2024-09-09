import Keyv from 'keyv'
import KeyvSqlite from '@keyv/sqlite'
import KeyvGzip from '@keyv/compress-gzip'
import fs from 'fs'

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

  console.log({cids})

  // add providers to db for each cid
  const promises = []
  for (const cid in cids) {
    promises.push(addCidProvidersToDatabase(cid, cids[cid])) 
  }
  await Promises.all(promises)
  console.log('finished 2')
}

const addCidProvidersToDatabase = async (cid, providers) => {
  const nextProviders = await keyv.get(cid) || {}
  for (const provider of providers) {
    nextProviders[provider.Payload.ID] = {
      Schema: 'peer',
      Addrs: provider.Payload.Addrs,
      ID: provider.Payload.ID,
      Protocols: [provider.Protocol]
    }
  }
  console.log('nextProviders', nextProviders)
  try {
    await keyv.set(cid, JSON.stringify(nextProviders))
  }
  catch (e) {
    console.log(e)
  }
  console.log('finished')
}

const getProviders = async (cid) => {
  await initDatabase()

  const providers = await keyv.get(cid)
  const providersArray = []
  for (const providerId in providers) {
    providersArray.push(providers[providerId])
  }
  return providersArray
}

const database = {
  addProviders,
  getProviders,

  // for testing
  clear: () => keyv.clear(),
  memory: () => {
    keyv = new Keyv({
      store: new KeyvSqlite('sqlite://:memory:'), 
      ttl: day
    })
  } 
}

export default database
