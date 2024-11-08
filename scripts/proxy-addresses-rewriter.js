import http from 'node:http'
import https from 'node:https'
import {parse as parseUrl} from 'url'
import Debug from 'debug'
const debug = Debug('plebbit-js:addresses-rewriter')

class AddressesRewriterProxyServer {
  constructor({plebbitOptions, port, hostname, proxyTargetUrl}) {
    this.addresses = []
    this.plebbitOptions = plebbitOptions
    this.port = port
    this.hostname = hostname || '127.0.0.1'
    this.proxyTarget = parseUrl(proxyTargetUrl)
    this.server = this.server = http.createServer((req, res) => this._proxyRequestRewrite(req, res))
  }

  listen(callback) {
    this._startUpdateAddressesLoop()
    this.server.listen(this.port, this.hostname, callback) 
  }

  _proxyRequestRewrite(req, res) {
    // get post body
    let reqBody = ''
    req.on('data', chunk => {reqBody += chunk.toString()})

    // wait for full post body
    req.on('end', () => {

      // rewrite body with up to date addresses
      let rewrittenBody = reqBody
      if (rewrittenBody) {
        try {
          const json = JSON.parse(rewrittenBody)
          for (const provider of json.Providers) {
            provider.Payload.Addrs = this.addresses
          }
          rewrittenBody = JSON.stringify(json)
        }
        catch (e) {
          debug('proxy body rewrite error:', e.message)
        }
      }

      // proxy the request
      const {request: httpRequest} = this.proxyTarget.protocol === 'https:' ? https : http
      const requestOptions = {
        hostname: this.proxyTarget.hostname,
        port: this.proxyTarget.port,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          'Content-Length': Buffer.byteLength(rewrittenBody)
        }
      }
      const proxyReq = httpRequest(requestOptions, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers)
        proxyRes.pipe(res, {end: true})
      })
      proxyReq.on('error', (e) => {
        debug('proxy error:', e.message)
        res.writeHead(500)
        res.end('Internal Server Error')
      })
      proxyReq.write(rewrittenBody)
      proxyReq.end()
    })
  }

  // get up to date listen addresses from kubo every x minutes
  _startUpdateAddressesLoop() {
    const tryUpdateAddrs = async () => {
      if (!this.plebbitOptions.ipfsHttpClientsOptions?.length) {
        throw Error('no plebbitOptions.ipfsHttpClientsOptions')
      }
      for (const ipfsHttpClientOptions of this.plebbitOptions.ipfsHttpClientsOptions) {
        const kuboApiUrl = ipfsHttpClientOptions.url || ipfsHttpClientOptions
        try {
          const res = await fetch(`${kuboApiUrl}/swarm/addrs/listen`, {method: 'POST'}).then(res => res.json())
          this.addresses = res.Strings
        }
        catch (e) {
          debug('tryUpdateAddrs error:', e.message)
        }
      }

    }
    tryUpdateAddrs()
    setInterval(tryUpdateAddrs, 1000 * 60)
  }
}

// example
const addressesRewriterProxyServer = new AddressesRewriterProxyServer({
  plebbitOptions: {ipfsHttpClientsOptions: ['http://127.0.0.1:5001/api/v0']},
  port: 8888,
  proxyTargetUrl: 'http://127.0.0.1:8889',
})
addressesRewriterProxyServer.listen(() => {
  console.log(`addresses rewriter proxy listening on http://${addressesRewriterProxyServer.hostname}:${addressesRewriterProxyServer.port}`)
})

/* example of how to use in plebbit-js

if (isNodeJs && plebbitOptions.ipfsHttpClientsOptions?.length && plebbitOptions.httpRoutersOptions?.length) {
  let proxyServerPort = 49622
  for (const [i] of plebbitOptions.httpRoutersOptions.entries()) {
    // launch the proxy server
    const port = proxyServerPort++
    const hostname = '127.0.0.1'
    const addressesRewriterProxyServer = new AddressesRewriterProxyServer({
      plebbitOptions: plebbitOptions,
      port, 
      hostname,
      proxyTargetUrl: 'http://127.0.0.1:8889',
    })
    addressesRewriterProxyServer.listen()

    // change the url of the router
    if (plebbitOptions.httpRoutersOptions[i].url) {
      plebbitOptions.httpRoutersOptions[i].url = `http://${hostname}:${port}`
    }
    else {
      plebbitOptions.httpRoutersOptions[i] = `http://${hostname}:${port}`
    }
  }

  // set kubo to the new routers with the proxy urls
}
*/