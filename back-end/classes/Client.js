class Client{
    constructor(userName, socket,router){
        this.userName = userName
        this.socket = socket
        this.upStreamTransport = null
        this.downStreamTransport = []
        this.producer = {}
        this.consumer = []
        this.room = null
    }
}
module.exports = Client