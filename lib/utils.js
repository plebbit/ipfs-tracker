import {multiaddr} from '@multiformats/multiaddr'
import IP from 'ip'
import assert from 'assert'

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

  // fix the ip 0.0.0.0 problem, TODO: probably not correct
  if (ip.isV4Format(reqIp)) {
    addrs = addrs.map(addr => addr.replace('0.0.0.0', reqIp)).filter(addr => addr.startsWith('/ip4/'))
  }
  else if (ip.isV6Format(reqIp)) {
    addrs = addrs.map(addr => addr.replace('::', reqIp)).filter(addr => addr.startsWith('/ip6/'))
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
