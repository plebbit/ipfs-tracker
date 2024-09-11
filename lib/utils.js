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

export const cleanAddrs = (addrs, reqIp) => {
  assert(reqIp && typeof reqIp === 'string', `cleanAddrs reqIp '${reqIp} not a string`)
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
