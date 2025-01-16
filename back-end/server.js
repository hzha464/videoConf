const fs = require('fs') 
const https = require('https')
const express = require('express')
const app = express()
app.use(express.static('public'))

const key = fs.readFileSync('./config/cert.key')
const cert = fs.readFileSync('./config/cert.crt')
const options = {key,cert}
const httpsServer = https.createServer(options, app)

const socketio = require('socket.io')
const mediasoup = require('mediasoup')

const config = require('./config/config')
const createWorkers = require('./createWorkers')

const io = socketio(httpsServer,{
    cors: [`https://localhost:${config.port}`],
    cors: [`https://192.168.1.44`]
})


let workers = null
let router = null

const initMediaSoup = async()=>{
    workers = await createWorkers()
    router = await workers[0].createRouter({
        mediaCodecs: config.routerMediaCodecs
    })
}

initMediaSoup()

io.on('connect', socket=>{})

httpsServer.listen(config.port)