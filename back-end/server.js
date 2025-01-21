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
const createWorkers = require('./utilities/createWorkers')
const getWorker = require('./utilities/getWorker')
const Client = require('./classes/Client')
const Room = require('./classes/Room')

const io = socketio(httpsServer,{
    cors: [`https://localhost:${config.port}`],
    cors: [`https://192.168.1.44`]
})


let workers = null
const rooms = []

const initMediaSoup = async()=>{
    workers = await createWorkers()
}

initMediaSoup()

io.on('connect', socket=>{
    let client
    let newRoom = false
    socket.on('join-room', async({userName,roomName},ackCb)=>{
        newRoom = true
        client = new Client(userName,socket) 
        let requestedRoom = rooms.find(room=>room.name === roomName)
        if(!requestedRoom){
            const workerToUse = await getWorker(workers)
            requestedRoom = new Room(roomName, workerToUse)
            await requestedRoom.createRouter()
            rooms.push(requestedRoom)
        }
        client.room = requestedRoom
        client.room.addClient(client)
        socket.join(client.room.roomName)
        ackCb({
            routerRtpCapabilities: client.room.router.rtpCapabilities,
            newRoom
        })
            
    })
})

httpsServer.listen(config.port)