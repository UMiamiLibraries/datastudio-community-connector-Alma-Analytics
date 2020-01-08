// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/** Define namespace */
var connector = connector || {};


/** @const */
connector.customConfig = [
  {
    name: 'path',
    displayName: 'report path',
    helpText: 'Enter the report path',
    placeholder: 'report path',
  }
];


/** @const */
connector.logEnabled = true;
  
/**
 * Wrapper function for `connector.getConfig()`
 *
 * @param {Object} request Config request parameters.
 * @returns {Object} Connector configuration to be displayed to the user.
 */
function getConfig(request) {
  return connector.logAndExecute('getConfig', request);
}

/**
 * Wrapper function for `connector.getSchema()`
 *
 * @param {Object} request Schema request parameters.
 * @returns {Object} Schema for the given request.
 */
function getSchema(request) {
  return connector.logAndExecute('getSchema', request);
}

/**
 * Wrapper function for `connector.getData()`
 *
 * @param {Object} request Data request parameters.
 * @returns {Object} Contains the schema and data for the given request.
 */
function getData(request) {
  return connector.logAndExecute('getData', request);
}

/**
 * Wrapper function for `connector.isAdminUser()`
 *
 * @returns {boolean} Returns true if the current authenticated user at the time
 * of function execution is an admin user of the connector. If the function is
 * omitted or if it returns false, then the current user will not be considered
 * an admin user of the connector.
 */
function isAdminUser() {
  return connector.logAndExecute('isAdminUser', null);
}

/**
 * Returns the user configurable options for the connector.
 *
 * Required function for Community Connector.
 *
 * @param {Object} request Config request parameters.
 * @returns {Object} Connector configuration to be displayed to the user.
 */
connector.getConfig = function(request) {
  var config = {
    configParams: connector.customConfig,
  };
  return config;
};

/**
 * Returns the tabular data for the given request.
 *
 * @param {Object} request Data request parameters.
 * @returns {Object} Contains the schema and data for the given request.
 */
connector.getData = function(request) {
  var xml = cacheManager.getCachedData('getData');
  var key = PropertiesService.getUserProperties().getProperty('dscc.key');
   
  var readDataFromCache = true;
  if(xml === null){
    readDataFromCache = false;
    var url = ['https://api-na.hosted.exlibrisgroup.com/almaws/v1/analytics/reports?apikey=',key,'&path=',request.configParams.path,'&limit=1000'];
    xml = UrlFetchApp.fetch(url.join('')).getContentText();
    cacheManager.setCachedData('getData', xml);
  }
   
  var document = XmlService.parse(xml);
  var fs_ = connector.getSchemaFromXML(document);
  var fixedSchema =fs_.schema.schema;
  var colmToName = fs_.colmToName;
  var root = document.getRootElement();
  var QueryResult = connector.findValue(root,'QueryResult');
  var token =      QueryResult.getChild('ResumptionToken',QueryResult.getNamespace()).getValue();
  var isFinished = QueryResult.getChild('IsFinished',     QueryResult.getNamespace()).getValue();
  
  var dataSchema = [];
  request.fields.forEach(function(field) {
    for (var i=0; i < this.length; i++) {
      if (this[i].name == field.name) {
        dataSchema.push(this[i]);
        break;
      }
    }
  },fixedSchema);
 
  var data= connector.extractDataFromDoc(document, colmToName, dataSchema);
  var index=1;
  while(isFinished == 'false')
  {
    var getDataAdditionalEntries = 'getData'+index++;
    xml = null;
    if(readDataFromCache) {
      xml = cacheManager.getCachedData(getDataAdditionalEntries);
    }
    if(xml === null){
      var url = ['https://api-na.hosted.exlibrisgroup.com/almaws/v1/analytics/reports?apikey=',key,'&token=',token,'&limit=1000'];
      xml = UrlFetchApp.fetch(url.join('')).getContentText();
      cacheManager.setCachedData(getDataAdditionalEntries, xml);
    }
    document = XmlService.parse(xml);
    var additinalData =  connector.extractDataFromDoc(document, colmToName, dataSchema);
    data = data.concat(additinalData);
    var QueryResult = connector.findValue(document.getRootElement(),'QueryResult');
    isFinished = QueryResult.getChild('IsFinished',QueryResult.getNamespace()).getValue(); 
  }
  
  return { 
    schema: dataSchema,
    rows: data,};
};

/**
helper functions
*/

/**
 * find the a path in the xml
 *
 * @param {currentPath} the current path on the XML
 * @param {value} the 'value' that need to find
 * @returns the cuttent path in the XML
 */
connector.findValue = function(currentPath, value){
  var elements_ = currentPath.getChildren();
  for(var i=0;i<elements_.length;i++)
  {
    var e_ = elements_[i].getName();
    if(e_==value) {
      return elements_[i];
    }
    else{
      var r_ = connector.findValue(elements_[i],value);
      if(r_ != undefined && r_.getName()== value ) {
        return r_;
      }
    }
  }
}

connector.extractDataFromDoc = function(document, colmToName, dataSchema){
  Logger.log('extractDataFromDoc');
  var root = document.getRootElement();
  var rowset = connector.findValue(root,'rowset');
  var entries = rowset.getChildren('Row',rowset.getNamespace());
  var rowAsJson = connector.buildJSONfromXML(entries,colmToName);
    
  var data = [];
  rowAsJson.forEach(function(entre) {
    var values = [];
    dataSchema.forEach(function(field) {
      var obj_ = entre[field.name];
      if(obj_ === undefined){
        obj_ = "NULL";
      }
      values.push(obj_);
      
    });
    data.push({
      values: values
    });
  });
  
  return data;
}

/**
 * conver the XML to JSON
 *
 * @param {entries} all the entris in XML format 
 * @param {colmsToName} map between the coml number and the name
 * @returns JSON object 
 */
connector.buildJSONfromXML = function(entries,colmsToName){
  var rowAsJson = [];
  //create JSON stract from the XML 
  for (var i = 0; i < entries.length; i++) {  
    var rows_ = entries[i].getChildren();
    var elment_ = new Object;
    rows_.forEach(function(row) {
       var ee = this.c2n[row.getName()];
      if(ee != undefined){
        this.el[ee] = row.getText().replace( /\-/g, '');
      }
    },{c2n:colmsToName, el:elment_});
    rowAsJson[i] = elment_;
  } 
  return rowAsJson;
}
/**
 * Throws errors messages with the correct prefix to be shown to users.
 *
 * @param {string} message Error message to be shown in UI
 * @param {boolean} userSafe Indicates whether the error message can be shown to
 *      regular users (as opposed to debug error messages meant for admin users
 *      only.)
 */
connector.throwError = function(message, userSafe) {
  if (userSafe) {
    message = 'DS_USER:' + message;
  }
  throw new Error(message);
};

/**
 * This checks whether the current user is an admin user of the connector.
 *
 * @returns {boolean} Returns true if the current authenticated user at the time
 * of function execution is an admin user of the connector. If the function is
 * omitted or if it returns false, then the current user will not be considered
 * an admin user of the connector.
 */
connector.isAdminUser = function() {
  return true;
};

/**
 * Stringifies parameters and responses for a given function and logs them to
 * Stackdriver.
 *
 * @param {string} functionName Function to be logged and executed.
 * @param {Object} parameter Parameter for the `functionName` function.
 * @returns {any} Returns the response of `functionName` function.
 */
connector.logAndExecute = function(functionName, parameter) {
  if (connector.logEnabled && connector.isAdminUser()) {
    var paramString = JSON.stringify(parameter, null, 2);
    console.log([functionName, 'request', paramString]);
  }

  var returnObject = connector[functionName](parameter);

  if (connector.logEnabled && connector.isAdminUser()) {
    var returnString = JSON.stringify(returnObject, null, 2);
    console.log([functionName, 'response', returnString]);
  }

  return returnObject;
};
