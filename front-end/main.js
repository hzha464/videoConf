import './style.css'
import buttons from './uiStuff/uiButton'
import { io } from 'socket.io-client'
import{Device} from 'mediasoup-client'
import createProducerTransport from './mediaSoupFunctions/createProducerTransport.js'
import createProducer from './mediaSoupFunctions/createProducer.js'
const socket = io('https://localhost:3031');

let device = null
let localStream = null
let producerTransport = null
let videoProducer = null
let audioProducer = null //THIS client's producer
let consumers = {} //key off the audioPid

socket.on('connect',()=>{
    console.log('connected')
})
const joinRoom = async()=>{
   const userName =document.getElementById('username').value
   const roomName =document.getElementById('room-input').value
   const joinRoom = await socket.emitWithAck('join-room',{userName,roomName})
//    console.log(joinRoom)
    device = new Device()
    await device.load({routerRtpCapabilities: joinRoom.routerRtpCapabilities})
    buttons.control.classList.remove('d-none')
}

const enableFeed = async()=>{
    localStream = await navigator.mediaDevices.getUserMedia({
        video:true,
        audio:true
    })
    buttons.localMediaLeft.srcObject = localStream
    buttons.enableFeed.disabled = true
    buttons.sendFeed.disabled = false
    buttons.muteBtn.disabled = false
}

const sendFeed = async()=>{
    producerTransport = await createProducerTransport(socket,device)
    const producer = await createProducer(producerTransport,localStream)
    console.log(producer)
    buttons.hangUp.disabled = false
}
buttons.joinRoom.addEventListener('click', joinRoom)
buttons.enableFeed.addEventListener('click', enableFeed)
buttons.sendFeed.addEventListener('click', sendFeed)