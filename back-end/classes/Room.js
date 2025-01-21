const config = require('../config/config.js')
class Room{
    constructor(roomName, workerToUse){
        this.name = roomName
        this.worker = workerToUse
        this.router = null
        this.clients = []
        this.activeSpeakerList = []
    }
    addClient(client){
        this.clients.push(client)
    }
    createRouter(mediaCodecs){
        return new Promise(async(resolve, reject)=>{
            this.router = await this.worker.createRouter({
                mediaCodecs: config.routerMediaCodecs
            })
            resolve()
        })
    }
}
module.exports = Room;