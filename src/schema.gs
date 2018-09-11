/**
 * Returns the schema for the given request.
 *
 * @param {Object} request Schema request parameters.
 * @returns {Object} Schema for the given request.
 */
connector.getSchema = function(request) {
     
  var userProperties = PropertiesService.getUserProperties();
  var key = userProperties.getProperty('dscc.key');
  
  var currentPath = cacheManager.getCachedData('table');
  
  if(request.configParams.path === '' && currentPath!=null){
    request.configParams.path = currentPath;
  }
  else if(currentPath === null || currentPath !== request.configParams.path){
    //clear the cache in case working on different table
    cacheManager.clearAllCachedData();
    cacheManager.setCachedData('table',request.configParams.path);
  }
  
  var xml = cacheManager.getCachedData('schem');
  if(xml ===null){
    var url = ['https://api-na.hosted.exlibrisgroup.com/almaws/v1/analytics/reports?apikey=',key,'&path=',
             request.configParams.path ];
    xml= UrlFetchApp.fetch(url.join('')).getContentText();
    cacheManager.setCachedData('schem',xml);
  }
 
  var document = XmlService.parse(xml);
  var ret = connector.getSchemaFromXLM(document).schema;
  return ret;
};

/**
 * Alma Analytics API return XML object
 * each table has different schema.
 * this function build dyamanic secema based on the XML schema
 *
 * @param {xml} the xml from the API
 * @returns {schema : scm_, colmToName :colmToName}; 'schema' is the schema & 'colmToName' is a table between the colm number and the colm name.
 */
connector.getSchemaFromXLM = function(xml){
  var SchemaToReturn = [];
  var colmToName = {};
  
  var schemFromCache = cacheManager.getCachedData('getSchemaFromXLM');
  if(schemFromCache !== null){
    return schemFromCache;
  }
   
  var root = xml.getRootElement();
  var rowset = connector.findValue(root, 'sequence')
  var elements = rowset.getChildren('element',rowset.getNamespace());
  for(var i=0; i< elements.length; i++){
    var element =  elements[i];
    var nameToValue = {};
    
    element.getAttributes().forEach(function(e) {
      this[e.getName()] = e.getValue().replace(/\(/g, '').replace(/\)/g, '');
    }, nameToValue);
    
    var isValANumber_ = parseInt(nameToValue['columnHeading']);
    if(!isNaN(isValANumber_) ) {
      continue;
    }
    var isNumberType = nameToValue['type'] == 'xsd:double' || nameToValue['type'] == 'xsd:int';
    var isStringType = nameToValue['type'] == 'xsd:string';
    var isDateType = nameToValue['type'] == 'xsd:date';
    
    var obj_ = {
      name: nameToValue['columnHeading'].replace(/ /g,'_'),
      label:  nameToValue['columnHeading'],
      description: nameToValue['columnHeading'],
      dataType: isNumberType ? 'NUMBER' : 'STRING',
      semantics : 
      {
        conceptType: isNumberType ? 'METRIC' : 'DIMENSION',
        semanticType: isStringType ? 'TEXT' : isNumberType ? 'NUMBER' : 'YEAR_MONTH_DAY',
        semanticGroup: isStringType ? 'STRING' : isNumberType ? 'NUMERIC' : 'DATETIME',
        isReaggregatable: isNumberType ? true :false
      }
    }
       
    if(!isNumberType)
    {
      delete obj_.semantics.isReaggregatable;
    }
    
    colmToName[nameToValue['name']] = obj_['name'];
    SchemaToReturn.push(obj_);
  }
  var scm_ = { schema : SchemaToReturn};
  var objToRet = {schema : scm_, colmToName :colmToName};
  cacheManager.setCachedData('getSchemaFromXLM', objToRet);
  return objToRet;
}
