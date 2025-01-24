// const updateActiveSpeakers = require("./updateActiveSpeakers")

function newDominantSpeaker(ds,room,io){
    console.log('======ds======',ds.producer.id)
    const i = room.activeSpeakerList.findIndex(pid=>pid === ds.producer.id)
    if(i > -1){
        const [ pid ] = room.activeSpeakerList.splice(i,1)
        room.activeSpeakerList.unshift(pid)
    }else{
        room.activeSpeakerList.unshift(ds.producer.id)
    }
    // console.log(room.activeSpeakerList)
    // // PLACEHOLDER - the activeSpeakerlist has changed!
    // // updateActiveSpeakers = mute/unmute/get new transports
    // const newTransportsByPeer = updateActiveSpeakers(room,io)
    // for(const [socketId, audioPidsToCreate] of Object.entries(newTransportsByPeer)){
    //     // we have the audioPidsToCreate this socket needs to create
    //     // map the video pids and the username
    //     const videoPidsToCreate = audioPidsToCreate.map(aPid=>{
    //         const producerClient = room.clients.find(c=>c?.producer?.audio?.id === aPid)
    //         return producerClient?.producer?.video?.id
    //     })
    //     const associatedUserNames = audioPidsToCreate.map(aPid=>{
    //         const producerClient = room.clients.find(c=>c?.producer?.audio?.id === aPid)
    //         return producerClient?.userName
    //     })
    //     io.to(socketId).emit('newProducersToConsume',{
    //         routerRtpCapabilities: room.router.rtpCapabilities,
    //         audioPidsToCreate,
    //         videoPidsToCreate,
    //         associatedUserNames,
    //         activeSpeakerList: room.activeSpeakerList.slice(0,5)
    //     })
    // }    
}

module.exports = newDominantSpeaker