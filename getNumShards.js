'use strict'
const path = require('path')
const fetch = require('node-fetch')
const parseResponse = require('parseResponse')
const BOT_BRIDGE_URI = process.env.BOT_BRIDGE_URI

module.exports = async()=>{
  try{
    let opts = { method: 'POST', timeout: 5000, headers: {'Content-Type': 'application/json'}, compress: true, body: JSON.stringify({ cmd: 'getNumShards' }) }
    let obj = await fetch(path.join(BOT_BRIDGE_URI, 'cmd'), opts)
    let res = await parseResponse(obj)
    return res?.body
  }catch(e){
    throw(e)
  }
}
