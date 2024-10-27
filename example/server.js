import http from 'http'
import _serveClient from './_serveClient.js'

const server = http.createServer()

server.listen(3000, () => {
  console.log('Server started. Open http://localhost:3000 in your browser')
})

_serveClient(server)
