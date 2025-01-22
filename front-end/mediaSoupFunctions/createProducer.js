const createProducer = async(producerTransport, localStream)=>{
    return new Promise(async(resolve, reject)=>{
        console.log(localStream)
        const videoTrack = localStream.getVideoTracks()[0]
        const audioTrack = localStream.getAudioTracks()[0]
        try{
            console.log("Calling produce on video")
            //fire connect event
            const videoProducer = await producerTransport.produce({track:videoTrack})
            console.log("Calling produce on audio")
            const audioProducer = await producerTransport.produce({track:audioTrack})
            console.log("finished producing!")
            resolve({audioProducer,videoProducer})
        }catch(err){
            console.log(err,"error producing")
        }
    })

}
export default createProducer