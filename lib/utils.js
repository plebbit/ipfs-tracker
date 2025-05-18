import {multiaddr} from '@multiformats/multiaddr'
import IP from 'ip'
import assert from 'assert'
import net from 'net'
import fs from 'fs'
import path from 'path'
import {fileURLToPath} from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const logKey = process.argv.includes('--log-key') && process.argv[process.argv.indexOf('--log-key') + 1]
const logFolderPath = path.join(__dirname, '..', 'log')
const logPath = logKey && path.join(logFolderPath, logKey)
if (logKey) {
  fs.mkdirSync(logFolderPath, {recursive: true})
}

export const logPostProviders = (req) => {
  if (!logKey) {
    return
  }
  const timestamp = new Date().toISOString()
  const ip = req.ip
  for (const provider of req.body?.Providers || []) {
    const peerId = provider?.Payload?.ID
    const addressCount = provider?.Payload?.Addrs?.length
    for (const key of provider?.Payload?.Keys || []) {
      const cid = key
      const log = `${timestamp} ${ip} ${peerId} ${cid} ${addressCount}\n`
      fs.appendFileSync(logPath, log, 'utf8')
    }
  }
}

export const randomizeArray = (array) => {
  let currentIndex = array.length
  while (currentIndex != 0) {
    let randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
  }
  return array
}

export const removeDuplicates = (array) => [...new Set(array)]

export const cleanAddrs = (addrs, reqIp) => {
  assert(reqIp && typeof reqIp === 'string', `cleanAddrs reqIp '${reqIp} not a string`)
  // remove nodejs prefix
  if (reqIp.startsWith('::ffff:')) {
    reqIp = reqIp.replace('::ffff:', '')
  }

  // fix the ip 0.0.0.0 kubo problem
  if (net.isIP(reqIp) === 4) {
    addrs = addrs.filter(addr => !addr.startsWith('/ip6/::')).map(addr => addr.replace('0.0.0.0', reqIp))
  }
  else if (net.isIP(reqIp) === 6) {
    addrs = addrs.filter(addr => !addr.startsWith('/ip4/0.0.0.0')).map(addr => addr.replace('::', reqIp))
  }

  // useful for testing
  if (process.env.NO_IP_VALIDATE) {
    return [...addrs]
  }

  const cleaned = []
  for (const addr of addrs) {
    // validate multiaddr
    multiaddr(addr)

    const ip = addr.match(/^\/ip(?:4|6)\/([^/]+)/)?.[1]
    if (!ip) {
      // TODO: what to do if addr is dns or other, doesn't contain an ip that we can validate?
      // allow for now
    }
    else if (!IP.isEqual(ip, reqIp)) {
      continue
    }
    else if (IP.isPrivate(ip)) {
      continue
    }
    cleaned.push(addr)
  }
  return cleaned
}

// normalize to cid v1 dag-pb codec base32
import {CID} from 'multiformats/cid'
const dagPbCodec = 0x70
const cidV1 = 1
export const normalizeCid = (cidString) => {
  const cid = CID.parse(cidString)
  // cid is correct codec
  if (cid.code === dagPbCodec) {
    return cid.toV1().toString()
  }
  const dagPbCid = CID.create(cidV1, dagPbCodec, cid.multihash)
  return dagPbCid.toString()
}
