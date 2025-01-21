
const createProducerTransport = (socket) => new Promise(async(resolve, reject)=>{
    const producerTransport = await socket.emitWith('requestTransport',{type:"producer"})

})
export default createProducerTransport