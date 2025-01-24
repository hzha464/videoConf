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
            await requestedRoom.createRouter(io)
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

    socket.on('requestTransport', async({type},ackCb)=>{
        let clientTransportParams
        if(type === 'producer'){
            clientTransportParams = await client.addTransport(type)
        }else if(type === 'consumer'){

        }
        ackCb(clientTransportParams)
    })
    socket.on('connectTransport',async({dtlsParameters,type,audioPid},ackCb)=>{
        if(type === "producer"){
            try{
                await client.upstreamTransport.connect({dtlsParameters}) 
                ackCb("success")               
            }catch(error){
                console.log(error)
                ackCb('error')
            }
        }else if(type === "consumer"){
            // find the right transport, for this consumer
            try{
                const downstreamTransport = client.downstreamTransports.find(t=>{
                    return t.associatedAudioPid === audioPid
                })
                downstreamTransport.transport.connect({dtlsParameters})
                ackCb("success")
            }catch(error){
                console.log(error)
                ackCb("error")
            }
        }
    })
    socket.on('startProducing',async({kind,rtpParameters},ackCb)=>{
        // create a producer with the rtpParameters we were sent
        try{
            const newProducer = await client.upstreamTransport.produce({kind,rtpParameters})
            //add the producer to this client obect
            client.addProducer(kind,newProducer)
            // if(kind === "audio"){
            //     client.room.activeSpeakerList.push(newProducer.id)
            // }
            // the front end is waiting for the id
            ackCb(newProducer.id)
        }catch(err){
            console.log(err)
            ackCb(err)
        }
    })

    socket.on('audioChange',typeOfChange=>{
        if(typeOfChange === "mute"){
            client?.producer?.audio?.pause()
        }else{
            client?.producer?.audio?.resume()
        }
    })

    
})

httpsServer.listen(config.port)