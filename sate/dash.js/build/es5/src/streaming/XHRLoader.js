/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */'use strict';Object.defineProperty(exports,'__esModule',{value:true});function _interopRequireDefault(obj){return obj && obj.__esModule?obj:{'default':obj};}function _defineProperty(obj,key,value){if(key in obj){Object.defineProperty(obj,key,{value:value,enumerable:true,configurable:true,writable:true});}else {obj[key] = value;}return obj;}var _voMetricsHTTPRequest=require('./vo/metrics/HTTPRequest');var _coreFactoryMaker=require('../core/FactoryMaker');var _coreFactoryMaker2=_interopRequireDefault(_coreFactoryMaker);var _utilsErrorHandler=require('./utils/ErrorHandler');var _utilsErrorHandler2=_interopRequireDefault(_utilsErrorHandler); /**
 * @module XHRLoader
 * @description Manages download of resources via HTTP.
 * @param {Object} cfg - dependancies from parent
 */function XHRLoader(cfg){cfg = cfg || {};var errHandler=cfg.errHandler;var metricsModel=cfg.metricsModel;var mediaPlayerModel=cfg.mediaPlayerModel;var requestModifier=cfg.requestModifier;var instance=undefined;var xhrs=undefined;var delayedXhrs=undefined;var retryTimers=undefined;var downloadErrorToRequestTypeMap=undefined;function setup(){var _downloadErrorToRequestTypeMap;xhrs = [];delayedXhrs = [];retryTimers = [];downloadErrorToRequestTypeMap = (_downloadErrorToRequestTypeMap = {},_defineProperty(_downloadErrorToRequestTypeMap,_voMetricsHTTPRequest.HTTPRequest.MPD_TYPE,_utilsErrorHandler2['default'].DOWNLOAD_ERROR_ID_MANIFEST),_defineProperty(_downloadErrorToRequestTypeMap,_voMetricsHTTPRequest.HTTPRequest.XLINK_EXPANSION_TYPE,_utilsErrorHandler2['default'].DOWNLOAD_ERROR_ID_XLINK),_defineProperty(_downloadErrorToRequestTypeMap,_voMetricsHTTPRequest.HTTPRequest.INIT_SEGMENT_TYPE,_utilsErrorHandler2['default'].DOWNLOAD_ERROR_ID_INITIALIZATION),_defineProperty(_downloadErrorToRequestTypeMap,_voMetricsHTTPRequest.HTTPRequest.MEDIA_SEGMENT_TYPE,_utilsErrorHandler2['default'].DOWNLOAD_ERROR_ID_CONTENT),_defineProperty(_downloadErrorToRequestTypeMap,_voMetricsHTTPRequest.HTTPRequest.INDEX_SEGMENT_TYPE,_utilsErrorHandler2['default'].DOWNLOAD_ERROR_ID_CONTENT),_defineProperty(_downloadErrorToRequestTypeMap,_voMetricsHTTPRequest.HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE,_utilsErrorHandler2['default'].DOWNLOAD_ERROR_ID_CONTENT),_defineProperty(_downloadErrorToRequestTypeMap,_voMetricsHTTPRequest.HTTPRequest.OTHER_TYPE,_utilsErrorHandler2['default'].DOWNLOAD_ERROR_ID_CONTENT),_downloadErrorToRequestTypeMap);}function internalLoad(config,remainingAttempts){var request=config.request;var xhr=new XMLHttpRequest();var traces=[];var firstProgress=true;var needFailureReport=true;var requestStartTime=new Date();var lastTraceTime=requestStartTime;var lastTraceReceivedCount=0;var handleLoaded=function handleLoaded(success){needFailureReport = false;request.requestStartDate = requestStartTime;request.requestEndDate = new Date();request.firstByteDate = request.firstByteDate || requestStartTime;if(!request.checkExistenceOnly){metricsModel.addHttpRequest(request.mediaType,null,request.type,request.url,xhr.responseURL || null,request.serviceLocation || null,request.range || null,request.requestStartDate,request.firstByteDate,request.requestEndDate,xhr.status,request.duration,xhr.getAllResponseHeaders(),success?traces:null);}};var onloadend=function onloadend(){if(xhrs.indexOf(xhr) === -1){return;}else {xhrs.splice(xhrs.indexOf(xhr),1);}if(needFailureReport){handleLoaded(false);if(remainingAttempts > 0){remainingAttempts--;retryTimers.push(setTimeout(function(){internalLoad(config,remainingAttempts);},mediaPlayerModel.getRetryIntervalForType(request.type)));}else {errHandler.downloadError(downloadErrorToRequestTypeMap[request.type],request.url,request);if(config.error){config.error(request,'error',xhr.statusText);}if(config.complete){config.complete(request,xhr.statusText);}}}};var progress=function progress(event){var currentTime=new Date();if(firstProgress){firstProgress = false;if(!event.lengthComputable || event.lengthComputable && event.total !== event.loaded){request.firstByteDate = currentTime;}}if(event.lengthComputable){request.bytesLoaded = event.loaded;request.bytesTotal = event.total;}traces.push({s:lastTraceTime,d:currentTime.getTime() - lastTraceTime.getTime(),b:[event.loaded?event.loaded - lastTraceReceivedCount:0]});lastTraceTime = currentTime;lastTraceReceivedCount = event.loaded;if(config.progress){config.progress();}};var onload=function onload(){if(xhr.status >= 200 && xhr.status <= 299){handleLoaded(true);if(config.success){config.success(xhr.response,xhr.statusText,xhr);}if(config.complete){config.complete(request,xhr.statusText);}}};var onabort=function onabort(){if(config.abort){config.abort(request,xhr.status);}};if(!requestModifier || !metricsModel || !errHandler){throw new Error('config object is not correct or missing');}try{var modifiedUrl=requestModifier.modifyRequestURL(request.url);var verb=request.checkExistenceOnly?_voMetricsHTTPRequest.HTTPRequest.HEAD:_voMetricsHTTPRequest.HTTPRequest.GET;xhr.open(verb,modifiedUrl,true);if(request.responseType){xhr.responseType = request.responseType;}if(request.range){xhr.setRequestHeader('Range','bytes=' + request.range);}if(!request.requestStartDate){request.requestStartDate = requestStartTime;}xhr = requestModifier.modifyRequestHeader(xhr);xhr.withCredentials = mediaPlayerModel.getXHRWithCredentialsForType(request.type);xhr.onload = onload;xhr.onloadend = onloadend;xhr.onerror = onloadend;xhr.onprogress = progress;xhr.onabort = onabort; // Adds the ability to delay single fragment loading time to control buffer.
var now=new Date().getTime();if(isNaN(request.delayLoadingTime) || now >= request.delayLoadingTime){ // no delay - just send xhr
xhrs.push(xhr);xhr.send();}else {(function(){ // delay
var delayedXhr={xhr:xhr};delayedXhrs.push(delayedXhr);delayedXhr.delayTimeout = setTimeout(function(){if(delayedXhrs.indexOf(delayedXhr) === -1){return;}else {delayedXhrs.splice(delayedXhrs.indexOf(delayedXhr),1);}try{requestStartTime = new Date();lastTraceTime = requestStartTime;xhrs.push(delayedXhr.xhr);delayedXhr.xhr.send();}catch(e) {delayedXhr.xhr.onerror();}},request.delayLoadingTime - now);})();}}catch(e) {xhr.onerror();}} /**
     * Initiates a download of the resource described by config.request
     * @param {Object} config - contains request (FragmentRequest or derived type), and callbacks
     * @memberof module:XHRLoader
     * @instance
     */function load(config){if(config.request){internalLoad(config,mediaPlayerModel.getRetryAttemptsForType(config.request.type));}} /**
     * Aborts any inflight downloads
     * @memberof module:XHRLoader
     * @instance
     */function abort(){retryTimers.forEach(function(t){return clearTimeout(t);});retryTimers = [];delayedXhrs.forEach(function(x){return clearTimeout(x.delayTimeout);});delayedXhrs = [];xhrs.forEach(function(x){ // abort will trigger onloadend which we don't want
// when deliberately aborting inflight requests -
// set them to undefined so they are not called
x.onloadend = x.onerror = x.onprogress = undefined;x.abort();});xhrs = [];}instance = {load:load,abort:abort};setup();return instance;}XHRLoader.__dashjs_factory_name = 'XHRLoader';var factory=_coreFactoryMaker2['default'].getClassFactory(XHRLoader);exports['default'] = factory;module.exports = exports['default'];
//# sourceMappingURL=XHRLoader.js.map
