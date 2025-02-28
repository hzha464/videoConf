const fs = require('fs') 
const https = require('https')
const http = require('http')
const express = require('express')
const app = express()
app.use(express.static('public'))

const key = fs.readFileSync('./config/cert.key')
const cert = fs.readFileSync('./config/cert.crt')
const options = {key,cert}
// const httpsServer = https.createServer(options, app)
const httpServer = http.createServer(app)

const socketio = require('socket.io')
const mediasoup = require('mediasoup')

const config = require('./config/config')
const createWorkers = require('./utilities/createWorkers')
const getWorker = require('./utilities/getWorker')
const Client = require('./classes/Client')
const Room = require('./classes/Room')
const updateActiveSpeakers = require('./utilities/updateActiveSpeakers')

// const io = socketio(httpsServer,{
//     // cors: [`https://localhost:${config.port}`],
//     cors: [`https://10.59.9.252:${config.port}`],
//     // cors: [`https://192.168.1.44`]
// })
// const io = socketio(httpsServer, {
const io = socketio(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    
    // cors: {
    //     origin: [`https://10.59.9.252:${config.port}`], // Allow frontend to connect
    //     methods: ["GET", "POST"],
    //     credentials: true  // If using authentication (cookies, etc.)
    // }
});

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


        const audioPidsToCreate = client.room.activeSpeakerList.slice(0,5)

        const videoPidsToCreate = audioPidsToCreate.map(aid=>{
            const producingClient = client.room.clients.find(c=>c?.producer?.audio?.id === aid)
            return producingClient?.producer?.video?.id
        })

        const associatedUserNames = audioPidsToCreate.map(aid=>{
            const producingClient = client.room.clients.find(c=>c?.producer?.audio?.id === aid)
            return producingClient?.userName
        })

        ackCb({
            routerRtpCapabilities: client.room.router.rtpCapabilities,
            newRoom,
            audioPidsToCreate,
            videoPidsToCreate,
            associatedUserNames
        })
            
    })

    socket.on('requestTransport', async({type,audioPid},ackCb)=>{
        let clientTransportParams
        if(type === 'producer'){
            clientTransportParams = await client.addTransport(type)
        }else if(type === 'consumer'){
            const producingClient = client.room.clients.find(c=>c?.producer?.audio?.id === audioPid)
            const videoPid = producingClient?.producer?.video?.id
            clientTransportParams = await client.addTransport(type,audioPid,videoPid)
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
        try{
            const newProducer = await client.upstreamTransport.produce({kind,rtpParameters})
            client.addProducer(kind,newProducer)
            if(kind === "audio"){
                client.room.activeSpeakerList.push(newProducer.id)
            }
            ackCb(newProducer.id)
        }catch(err){
            console.log(err)
            ackCb(err)
        }

        const newTransportsByPeer = updateActiveSpeakers(client.room,io)

        for(const [socketId, audioPidsToCreate] of Object.entries(newTransportsByPeer)){

            const videoPidsToCreate = audioPidsToCreate.map(aPid=>{
                const producerClient = client.room.clients.find(c=>c?.producer?.audio?.id === aPid)
                return producerClient?.producer?.video?.id
            })
            const associatedUserNames = audioPidsToCreate.map(aPid=>{
                const producerClient = client.room.clients.find(c=>c?.producer?.audio?.id === aPid)
                return producerClient?.userName
            })
            io.to(socketId).emit('newProducersToConsume',{
                routerRtpCapabilities: client.room.router.rtpCapabilities,
                audioPidsToCreate,
                videoPidsToCreate,
                associatedUserNames,
                activeSpeakerList: client.room.activeSpeakerList.slice(0,5)
            })
        }
    })

    socket.on('audioChange',typeOfChange=>{
        if(typeOfChange === "mute"){
            client?.producer?.audio?.pause()
        }else{
            client?.producer?.audio?.resume()
        }
    })

    socket.on('consumeMedia',async({rtpCapabilities,pid,kind},ackCb)=>{
        console.log("Kind: ",kind,"   pid:",pid)

        try{
            if(!client.room.router.canConsume({producerId:pid, rtpCapabilities})){
                ackCb("cannotConsume")
            }else{
                const downstreamTransport = client.downstreamTransports.find(t=>{
                    if(kind === "audio"){
                        return t.associatedAudioPid === pid
                    }else if(kind === "video"){
                        return t.associatedVideoPid === pid
                    }
                })
                const newConsumer = await downstreamTransport.transport.consume({
                    producerId: pid,
                    rtpCapabilities,
                    paused: true
                })
                client.addConsumer(kind,newConsumer,downstreamTransport)
                const clientParams = {
                    producerId: pid,
                    id: newConsumer.id,
                    kind: newConsumer.kind,
                    rtpParameters: newConsumer.rtpParameters
                }
                ackCb(clientParams)
            }
        }catch(err){
            console.log(err)
            ackCb('consumeFailed')
        }
    })

    socket.on('unpauseConsumer',async({pid,kind},ackCb)=>{
        const consumerToResume = client.downstreamTransports.find(t=>{
            return t?.[kind].producerId === pid
        })
        await consumerToResume[kind].resume()
        ackCb()
    })

    socket.on('leave-room',async(ackCb)=>{
        // client.room.removeClient(client)
        // if(client.room.clients.length === 0){
        //     client.room.close()
        //     rooms.splice(rooms.indexOf(client.room),1)
        // }
        try{
            ackCb("closed")
        }catch(err){
            ackCb("error")
        }
    })



    socket.on("draw", (data) => {
        // Broadcast to all other clients
        socket.broadcast.emit("draw", data);
      });
})

// httpsServer.listen(config.port)
httpServer.listen(config.port, config.webRtcTransport.listenIps[0].announcedIp, () => {
    console.log(`Server running on ${config.webRtcTransport.listenIps[0].announcedIp}:${config.port}`);
});

  