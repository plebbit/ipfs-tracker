import http from 'node:http'
import https from 'node:https'
import { parse as parseUrl } from 'node:url'
import { inspect } from 'node:util'
inspect.defaultOptions.depth = null

const kuboApiUrl = 'http://127.0.0.1:5001/api/v0'
const hostname = '127.0.0.1'
const port = 8888
const targetHostname = '127.0.0.1'
const targetPort = 8889

let addrs = []
const tryUpdateAddrs = async () => {
  try {
    const res = await fetch(`${kuboApiUrl}/swarm/addrs/listen`, {method: 'POST'}).then(res => res.json())
    addrs = res.Strings
  }
  catch (e) {
    console.log('tryUpdateAddrs error:', e.message)
  }
}
tryUpdateAddrs()
setInterval(tryUpdateAddrs, 1000 * 60)

const server = http.createServer((req, res) => {
  // get post body
  let reqBody = ''
  req.on('data', chunk => {
    reqBody += chunk.toString()
  })

  req.on('end', () => {
    console.log({method: req.method, url: req.url, headers: req.headers, body: reqBody})

    // rewrite body with correct addresses
    let rewrittenBody = reqBody
    if (rewrittenBody) {
      try {
        const json = JSON.parse(rewrittenBody)
        for (const provider of json.Providers) {
          provider.Payload.Addrs = addrs
        }
        rewrittenBody = JSON.stringify(json)
      }
      catch (e) {
        console.error('proxy body rewrite error:', e.message)
      }
    }

    const requestOptions = {
      hostname: targetHostname,
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        'Content-Length': Buffer.byteLength(rewrittenBody)
      }
    }

    // proxy the request
    const _http = targetPort === 443 ? https : http
    const proxyReq = _http.request(requestOptions, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers)
      proxyRes.pipe(res, {end: true})
    })
    proxyReq.on('error', (e) => {
      console.error('proxy error:', e.message)
      res.writeHead(500)
      res.end('Internal Server Error')
    })
    proxyReq.write(rewrittenBody)
    proxyReq.end()
  })
})

server.listen(port, hostname, () => {
  console.log(`proxy listening on http://${hostname}:${port}`)
})
