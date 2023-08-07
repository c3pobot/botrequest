'use strict'
const log = require('./logger')
let logLevel = process.env.LOG_LEVEL || log.Level.INFO;
log.setLevel(logLevel);
const fetch = require('./fetch')
const BOT_NODE_NAME_PREFIX = process.env.BOT_NODE_NAME_PREFIX || 'bot'
const BOT_SVC = process.env.BOT_SVC || 'bot:3000'

let BOT_TOTAL_SHARDS = 1, notify = true, retryCount = 10
const getPodName = async(obj = {})=>{
  try{
    if(BOT_TOTAL_SHARDS === 1) return `${BOT_NODE_NAME_PREFIX}-0`
    if(!obj.sId) return
    let id = (Number(BigInt(obj.sId) >> 22n) % (+BOT_TOTAL_SHARDS))
    if(id >= 0) return `${BOT_NODE_NAME_PREFIX}-${id}`
  }catch(e){
    throw(e);
  }
}
const requestWithRetry = async(uri, opts = {}, count = 0)=>{
  try{
    let res = await fetch(uri, opts)
    if(res?.error === 'FetchError'){
      if(count < retryCount){
        count++
        return await requestWithRetry(uri, opts, count)
      }else{
        throw(`tried request ${count} time(s) and errored with ${res.error} : ${res.message}`)
      }
    }
    return res
  }catch(e){
    throw(e)
  }
}
const allBotRequest = async(cmd, opts = {})=>{
  try{
    let array = [], res = [], i = BOT_TOTAL_SHARDS

    const singleBotRequest = async(shardId, opt = {})=>{
      try{
        let payload = { method: 'POST', timeout: 60000, compress: true, headers: {"Content-Type": "application/json"} }
        payload.body = JSON.stringify({ ...opts, ...{ cmd: cmd, podName: `${BOT_NODE_NAME_PREFIX}-${shardId}` } })
        let obj = await requestWithRetry(`http://${BOT_NODE_NAME_PREFIX}-${shardId}.${BOT_SVC}/cmd`, payload)
        if(obj?.body) res.push(obj.body)
      }catch(e){
        throw(e);
      }
    }
    while(i--) array.push(singleBotRequest(i, opts))
    await Promise.all(array)
    return res
  }catch(e){
    throw(e)
  }
}
const monitorNumShards = async()=>{
  try{
    let opts = { timeout: 5000, compress: true, method: 'GET' }
    let res = await requestWithRetry(`http://${BOT_SVC}/getNumShards`, opts)
    if(res?.body?.totalShards && +res.body.totalShards > 0){
      if(BOT_TOTAL_SHARDS !== +res.body.totalShards){
        log.info(`Change in number of ${BOT_NODE_NAME_PREFIX} shards from ${BOT_TOTAL_SHARDS} to ${res.body.totalShards}`)
        BOT_TOTAL_SHARDS = res.body.totalShards
      }
    }
    setTimeout(monitorNumShards, 5000)
  }catch(e){
    setTimeout(monitorNumShards, 5000)
    throw(e)
  }
}
monitorNumShards()
module.exports = async(cmd, opts = {})=>{
  try{
    if(!cmd || !BOT_TOTAL_SHARDS) return
    let podName = opts.podName
    if(!podName) podName = await getPodName(opts)
    if(!podName) throw('Error getting podName...')
    if(podName === 'all') return await allBotRequest(cmd, opts)
    let payload = { method: 'POST', timeout: 60000, compress: true, headers: {"Content-Type": "application/json"} }
    payload.body = JSON.stringify({ ...opts, ...{ cmd: cmd, podName: podName, numShards: BOT_TOTAL_SHARDS } })
    let res = await requestWithRetry(`http://${podName}.${BOT_SVC}/cmd`, payload)
    if(res?.body?.totalShards){
      log.info(`Change in number of ${BOT_NODE_NAME_PREFIX} shards from ${BOT_TOTAL_SHARDS} to ${res.body.totalShards}`)
      BOT_TOTAL_SHARDS = +res?.body?.totalShards
      payload.body = JSON.stringify({ ...opts, ...{ cmd: cmd, podName: podName, numShards: BOT_TOTAL_SHARDS } })
      res = await requestWithRetry(`http://${podName}.${BOT_SVC}/cmd`, payload)
    }
    if(res?.body) return res.body
    throw(res)
  }catch(e){
    throw(e);
  }
}
