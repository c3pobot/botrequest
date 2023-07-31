'use strict'
const fetch = require('node-fetch')
const LOG_SERVER_URI = process.env.LOG_SERVER_URI
const POD_NAME = process.env.POD_NAME
const SET_NAME = process.env.SET_NAME
const sendRequest = async(payload)=>{
  try{
    await fetch(LOG_SERVER_URI, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {'Content-Type': 'application/json'},
      timeout: 30000
    })
  }catch(e){

  }
}
module.exports = (type, timestamp, content)=>{
  if(!LOG_SERVER_URI) return
  let payload = {
    level: type,
    message: content,
    timestamp: timestamp
  }
  if(POD_NAME && SET_NAME){
    payload.pod = POD_NAME
    payload.set = SET_NAME
  }
  sendRequest(payload)
}
