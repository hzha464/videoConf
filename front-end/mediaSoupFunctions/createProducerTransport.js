
const createProducerTransport = (socket,device) => new Promise(async(resolve, reject)=>{
    const producerTransportParams = await socket.emitWithAck('requestTransport',{type:"producer"})
    const producerTransport = device.createSendTransport(producerTransportParams)
    producerTransport.on('connect',async({dtlsParameters},callback,errback)=>{
    
        const connectResp = await socket.emitWithAck('connectTransport',{dtlsParameters,type:"producer"})
        console.log(connectResp,"connectResp is back")
        if(connectResp === "success"){
            callback()
        }else if(connectResp === "error"){
            errback()
        }
    })
    producerTransport.on('produce',async(parameters, callback, errback)=>{
        console.log("Produce event is now running")
        const { kind, rtpParameters } = parameters
        const produceResp = await socket.emitWithAck('startProducing',{kind, rtpParameters})
        console.log(produceResp,"prod uceResp is back!")
        if(produceResp === "error"){
            errback()
        }else{
            callback({id:produceResp})
        }
    })

    resolve(producerTransport)
})
export default createProducerTransport