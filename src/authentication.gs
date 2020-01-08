
/**
 * Wrapper functions for authentication
 */

/**
 * Wrapper function for `connector.getAuthType()`
 *
 * @returns {Object} `AuthType` used by the connector.
 */
function getAuthType() {
  return connector.logAndExecute('getAuthType', null);
}
  
 /**
 * Wrapper function for `connector.resetAuth()`
 *
 * @returns {Object} `AuthType` used by the connector.
 */
function resetAuth() {
  return connector.logAndExecute('resetAuth', null);
}
 /**
 * Wrapper function for `connector.isAuthValid()`
 *
 * @returns {Object} `AuthType` used by the connector.
 */
function isAuthValid() {
  return connector.logAndExecute('isAuthValid', null);
}
  
/**
 * Wrapper function for `connector.setCredentials(request)`
 *
 * @returns {Object} `AuthType` used by the connector.
 */
function setCredentials(request){
  return connector.logAndExecute('setCredentials', request);
}


/**
 * Returns the authentication method required by the connector to authorize the
 * third-party service.
 *
 * Required function for Community Connector.
 *
 * @returns {Object} `AuthType` used by the connector.
 */
connector.getAuthType = function() {
  var response = {
    "type": "KEY"
  };
  return response;
};

  /**
 * Reset the authentication key
 * third-party service.
 *
 * Required function for Community Connector.
 *
 * @returns {Object} `AuthType` used by the connector.
 */
connector.resetAuth = function() {
  var userProperties = PropertiesService.getUserProperties();
  userProperties.deleteProperty('dscc.key');
  Logger.log('resetAuth');
}
 
 /**
 * check validation of the key
 * third-party service.
 *
 * Required function for Community Connector.
 *
 * @returns {Object} `AuthType` used by the connector.
 */
connector.isAuthValid = function(){
  var userProperties = PropertiesService.getUserProperties();
  var key = userProperties.getProperty('dscc.key');
  var isValid = false;
  if(key != null)
  {
     isValid = connector.checkForValidKey(key);
  }
  Logger.log('key is valid:%s', isValid);
  return isValid;
}
/**
 * set Credentials key
 * third-party service.
 *
 * Required function for Community Connector.
 *
 * @returns {Object} `errorCode`.
 */
connector.setCredentials = function(request) {
  var key = request.key;  
  var validKey = connector.checkForValidKey(key);
  if (!validKey) {
    return {
      errorCode: "INVALID_CREDENTIALS"
    };
  }
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('dscc.key', key);
  return {
    errorCode: "NONE"
  };
}
/**
 * check if key valid
 * third-party service.
 * in case the API does not recognize the key the return is'Invalid API Key'
 * @param {string} key.
 *
 * @returns bool.
 */
connector.checkForValidKey = function(key)
{
  var url = ['https://api-na.hosted.exlibrisgroup.com/almaws/v1/analytics/reports?apikey=',key];
  var res_ = UrlFetchApp.fetch( url.join(''),{   muteHttpExceptions: true  });
  var responseBody = res_.getContentText();
  if(responseBody.indexOf('Invalid API Key') != -1) return false;
  if(responseBody.indexOf('UNAUTHORIZED') != -1) return false;
  return true; 
}
  
