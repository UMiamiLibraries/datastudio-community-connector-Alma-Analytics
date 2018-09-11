

/** Define namespace */
// public functions
var cacheManager = cacheManager || {};

cacheManager.setCachedData = function(key, val){
  cacheManagerHelper.entryPoint('setCachedData', key, val);
}
cacheManager.getCachedData = function(key){
  var ret =  cacheManagerHelper.entryPoint('getCachedData', key, null);
  if(ret === null || ret === undefined || ret ==='') {
    ret = null;
  }
  return ret;
}
cacheManager.clearKeyCachedData = function(key){
  cacheManagerHelper.entryPoint('clearKeyCachedData', key, null);
}
cacheManager.clearAllCachedData = function(){
  cacheManagerHelper.entryPoint('clearCachedData', null, null);
}

//private functions
var cacheManagerHelper = cacheManagerHelper || {};

cacheManagerHelper.cache_ = CacheService.getUserCache();
cacheManagerHelper.MAX_STR_LENGTH = (100*1024);
cacheManagerHelper.PART_KEY = '_partKey';
cacheManagerHelper.cacheExpiration = 60 *15;
cacheManagerHelper.keysList = {};
cacheManagerHelper.isInit = false;
cacheManagerHelper.log = true;
cacheManagerHelper.usingCache = false;

cacheManagerHelper.entryPoint = function(func, key, val){
  if(!cacheManagerHelper.usingCache){
    console.log('NOT using cache');
    return null;
  }
  cacheManagerHelper.init();
  if(cacheManagerHelper.log){
    console.log('function:%s, key:%s, val:%s', func, key,val);
  }
  var ret = cacheManagerHelper[func](key,val);
  if(cacheManagerHelper.log){
    console.log('function:%s, return %s', func, ret);
  }
  return ret;
}

cacheManagerHelper.init = function(){
  if(!cacheManagerHelper.isInit){
    cacheManagerHelper.keysList =  cacheManagerHelper.cache_.get('cacheManagerHelperKeys');
    if(cacheManagerHelper.keysList !=='' && cacheManagerHelper.keysList != null){
      cacheManagerHelper.keysList  = JSON.parse(cacheManagerHelper.keysList);
    }
    else{
      cacheManagerHelper.keysList = {};
    }
    cacheManagerHelper.isInit = true;
  }
}

cacheManagerHelper.setCachedData = function(key, val) {
  
  if(val === null || val ==='' || key === null || key ==='') return;
  
  var obj = val;
  if(typeof val !== "string"){ 
    obj = JSON.stringify(val);
  }
  var vals = cacheManagerHelper.splitValue(obj);
  cacheManagerHelper.setKeyInfo(key, vals.length, typeof val);
  for(var i=0;i<vals.length;i++)
  {
    var partKey = key+ cacheManagerHelper.PART_KEY +i;
    cacheManagerHelper.cache_.put(partKey, vals[i], cacheManagerHelper.cacheExpiration);
  }
 
};

cacheManagerHelper.clearCachedData = function(){
  for (var p in cacheManagerHelper.keysList){
    cacheManagerHelper.clearKeyCachedData(p);
  }
}

cacheManagerHelper.clearKeyCachedData = function(key){
  var keyInfo = cacheManagerHelper.getKeyInfo(key, true);
  if(keyInfo != null){
    for(var i=0; i< keyInfo.size; i++){
      var partKey = key + cacheManagerHelper.PART_KEY +i;
      cacheManagerHelper.cache_.remove(partKey);
    }
  }
  cacheManagerHelper.clearKeyInfo(key);
  cacheManagerHelper.cache_.remove(key);
}

cacheManagerHelper.getCachedData = function(key) {
  
  var keyInfo =  cacheManagerHelper.getKeyInfo(key, false);
  if( keyInfo === null || keyInfo ==='' || keyInfo === undefined) return null;
  
  var partData = '';
  for(var i=0; i< keyInfo.size; i++){
    var partKey = key+ cacheManagerHelper.PART_KEY +i;
    partData += cacheManagerHelper.cache_.get(partKey);
  }
  
  if(partData !=='' && keyInfo.type != 'string'){
    partData = JSON.parse(partData);
  }
  if(cacheManagerHelper.log){
    console.log('keyInfo %s',keyInfo );
    console.log('data %s',partData );
  }
  return partData;
};

cacheManagerHelper.splitValue = function(val){
  var  splitVal = [];
  do{
    var v = val.substring(0,cacheManagerHelper.MAX_STR_LENGTH);
    val = val.substring(cacheManagerHelper.MAX_STR_LENGTH);
    splitVal.push(v);
  }while(val.length > 0);
  return splitVal;
}

cacheManagerHelper.setKeyInfo = function(key, size, type){
  var d = new Date();
  var timeStamp = d.getTime(); 
  var keyInfo = {'size':size, type:type, 'time' :timeStamp};
  var obj = JSON.stringify(keyInfo);
  cacheManagerHelper.keysList[key] = size;
  var keyList = JSON.stringify(cacheManagerHelper.keysList);
  cacheManagerHelper.cache_.put('cacheManagerHelperKeys', keyList, cacheManagerHelper.cacheExpiration);
  cacheManagerHelper.cache_.put(key, obj, cacheManagerHelper.cacheExpiration);
}

cacheManagerHelper.getKeyInfo = function(key, ignorTime){
  var keyInfo = null;
  var data = cacheManagerHelper.cache_.get(key);
  
  if(data !==null && data!==''){
    keyInfo = JSON.parse(data);
    if(!ignorTime){ 
      var d = new Date();
      var currentTime = d.getTime();
      if(currentTime-keyInfo.time >=(cacheManagerHelper.cacheExpiration-120)*1000 ){
        cacheManagerHelper.getCachedData(key);
        keyInfo = null;
      }
    }
  }
  return keyInfo;
}

cacheManagerHelper.clearKeyInfo = function(key){
  delete cacheManagerHelper.keysList[key];
  delete cacheManagerHelper.keysList.key;
  var keyList = JSON.stringify(cacheManagerHelper.keysList);
  cacheManagerHelper.cache_.put('cacheManagerHelperKeys', keyList, cacheManagerHelper.cacheExpiration);
}

