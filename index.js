'use strict'
const fetch = require('node-fetch')
const path = require('path')
const BOT_BRIDGE_URI = process.env.BOT_BRIDGE_URI
const parseResponse = require('./parseResponse')

const fetchRequest = async(uri, opts = {})=>{
  try{
    let res = await fetch(uri, opts)
    return await parseResponse(res)
  }catch(e){
    if(e?.error) return {error: e.name, message: e.message, type: e.type}
    if(e?.status) return await parseResponse(e)
    throw(e)
  }
}
const requestWithRetry = async(uri, opts = {}, count = 0)=>{
  try{
    let res = await fetchRequest(uri, opts)
    if(res?.error === 'FetchError' && 10 >= count){
      count++
      return await requestWithRetry(uri, opts, count)
    }
    return res
  }catch(e){
    throw(e)
  }
}
module.exports = async(body = {})=>{
  try{
    let opts = {method: 'POST', timeout: 60000, compress: true, headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)}
    let res = await requestWithRetry(BOT_BRIDGE_URI+'/cmd', opts)
    if(res?.body) return res.body
    console.error(res)
  }catch(e){
    console.error(e);
  }
}
