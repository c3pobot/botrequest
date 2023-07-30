'use strict'
const fetch = require('node-fetch')
const path = require('path')
const getNumShards = require('./getNumShards')
const BOT_NODE_NAME_PREFIX = process.env.BOT_NODE_NAME_PREFIX || 'bot'
const BOT_SVC = process.env.BOT_SVC || 'bot:3000'
const parseResponse = require('./parseResponse')
let BOT_TOTAL_SHARDS, enumShardNum = {}
const enumShards = async()=>{
  try{
    let tempObj = await getNumShards()
    if(!tempObj?.totalShards) throw('Error getting number of shards...')
    BOT_TOTAL_SHARDS = +tempObj.totalShards
    let i = BOT_TOTAL_SHARDS
    while(i--) enumShardNum[BOT_NODE_NAME_PREFIX+'-'+i] = { id: +i, podName: BOT_NODE_NAME_PREFIX+'-'+i, url: 'http://'+BOT_NODE_NAME_PREFIX+'-'+i+'.'+BOT_SVC+'/cmd' }
    if(Object.values(enumShardNum).length === 0) setTimeout(enumShards, 5000)
    console.log(JSON.stringify(enumShardNum))
  }catch(e){
    console.error(e)
    setTimeout(enumShards, 5000)
  }
}
const getPodName = async(obj = {})=>{
  try{
    if(!obj.sId) return
    let id = (Number(BigInt(obj.sId) >> 22n) % (+BOT_TOTAL_SHARDS))
    if(id >= 0) return BOT_NODE_NAME_PREFIX+'-'+id
  }catch(e){
    throw(e);
  }
}
const fetchRequest = async(uri, opts = {})=>{
  try{
    let res = await fetch(uri, opts)
    return await parseResponse(res)
  }catch(e){
    console.log(e?.error)
    if(e?.error) return {error: e.error, message: e.message, type: e.type}
    if(e?.status) return await parseResponse(e)
    throw(e)
  }
}
const requestWithRetry = async(uri, opts = {}, count = 0)=>{
  try{
    let res = await fetchRequest(uri, opts)
    if(res?.error === 'FetchError'){
      if(count < 10){
        count++
        return await requestWithRetry(uri, opts, count)
      }else{
        console.log('Tried 10 times with error ...')
        console.log(res)
      }
    }
    return res
  }catch(e){
    throw(e)
  }
}
enumShards()
module.exports = async(cmd, opts = {})=>{
  try{
    console
    if(!cmd || !BOT_TOTAL_SHARDS) return
    let podName = opts.podName
    if(!podName) podName = await getPodName(opts)
    if(!podName || !enumShardNum[podName]) return
    let payload = {method: 'POST', timeout: 60000, compress: true, headers: {"Content-Type": "application/json"}}
    payload.body = JSON.stringify({ ...opts, ...{ cmd: cmd, podName: podName } })
    let res = await requestWithRetry(enumShardNum[podName].url, payload)
    if(res?.body) return res.body
    throw(res)
  }catch(e){
    throw(e);
  }
}
