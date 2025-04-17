import {multiaddr} from '@multiformats/multiaddr'
import IP from 'ip'
import assert from 'assert'
import net from 'net'

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
    const ip = multiaddr(addr).nodeAddress().address
    if (!IP.isEqual(ip, reqIp)) {
      continue
    }
    if (IP.isPrivate(ip)) {
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
