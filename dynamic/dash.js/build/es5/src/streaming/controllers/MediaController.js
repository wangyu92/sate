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
 */'use strict';Object.defineProperty(exports,'__esModule',{value:true});function _interopRequireDefault(obj){return obj && obj.__esModule?obj:{'default':obj};}var _constantsConstants=require('../constants/Constants');var _constantsConstants2=_interopRequireDefault(_constantsConstants);var _coreEventsEvents=require('../../core/events/Events');var _coreEventsEvents2=_interopRequireDefault(_coreEventsEvents);var _coreEventBus=require('../../core/EventBus');var _coreEventBus2=_interopRequireDefault(_coreEventBus);var _coreFactoryMaker=require('../../core/FactoryMaker');var _coreFactoryMaker2=_interopRequireDefault(_coreFactoryMaker);var _coreDebug=require('../../core/Debug');var _coreDebug2=_interopRequireDefault(_coreDebug);var TRACK_SWITCH_MODE_NEVER_REPLACE='neverReplace';var TRACK_SWITCH_MODE_ALWAYS_REPLACE='alwaysReplace';var TRACK_SELECTION_MODE_HIGHEST_BITRATE='highestBitrate';var TRACK_SELECTION_MODE_WIDEST_RANGE='widestRange';var DEFAULT_INIT_TRACK_SELECTION_MODE=TRACK_SELECTION_MODE_HIGHEST_BITRATE;function MediaController(){var context=this.context;var log=(0,_coreDebug2['default'])(context).getInstance().log;var eventBus=(0,_coreEventBus2['default'])(context).getInstance();var instance=undefined,tracks=undefined,initialSettings=undefined,selectionMode=undefined,switchMode=undefined,errHandler=undefined,domStorage=undefined;var validTrackSwitchModes=[TRACK_SWITCH_MODE_ALWAYS_REPLACE,TRACK_SWITCH_MODE_NEVER_REPLACE];var validTrackSelectionModes=[TRACK_SELECTION_MODE_HIGHEST_BITRATE,TRACK_SELECTION_MODE_WIDEST_RANGE];function setup(){reset();} /**
     * @param {string} type
     * @param {StreamInfo} streamInfo
     * @memberof MediaController#
     */function checkInitialMediaSettingsForType(type,streamInfo){var settings=getInitialSettings(type);var tracksForType=getTracksFor(type,streamInfo);var tracks=[];if(type === _constantsConstants2['default'].FRAGMENTED_TEXT){ // Choose the first track
setTrack(tracksForType[0]);return;}if(!settings){settings = domStorage.getSavedMediaSettings(type);setInitialSettings(type,settings);}if(!tracksForType || tracksForType.length === 0)return;if(settings){tracksForType.forEach(function(track){if(matchSettings(settings,track)){tracks.push(track);}});}if(tracks.length === 0){setTrack(selectInitialTrack(tracksForType));}else {if(tracks.length > 1){setTrack(selectInitialTrack(tracks));}else {setTrack(tracks[0]);}}} /**
     * @param {MediaInfo} track
     * @memberof MediaController#
     */function addTrack(track){var mediaType=track?track.type:null;var streamId=track?track.streamInfo.id:null;var initSettings=getInitialSettings(mediaType);if(!track || !isMultiTrackSupportedByType(mediaType))return;tracks[streamId] = tracks[streamId] || createTrackInfo();var len=tracks[streamId][mediaType].list.length;for(var i=0;i < len;i++) { //track is already set.
if(isTracksEqual(tracks[streamId][mediaType].list[i],track)){return;}}tracks[streamId][mediaType].list.push(track);if(initSettings && matchSettings(initSettings,track) && !getCurrentTrackFor(mediaType,track.streamInfo)){setTrack(track);}} /**
     * @param {string} type
     * @param {StreamInfo} streamInfo
     * @returns {Array}
     * @memberof MediaController#
     */function getTracksFor(type,streamInfo){if(!type || !streamInfo)return [];var id=streamInfo.id;if(!tracks[id] || !tracks[id][type])return [];return tracks[id][type].list;} /**
     * @param {string} type
     * @param {StreamInfo} streamInfo
     * @returns {Object|null}
     * @memberof MediaController#
     */function getCurrentTrackFor(type,streamInfo){if(!type || !streamInfo || streamInfo && !tracks[streamInfo.id])return null;return tracks[streamInfo.id][type].current;} /**
     * @param {MediaInfo} track
     * @returns {boolean}
     * @memberof MediaController#
     */function isCurrentTrack(track){var type=track.type;var id=track.streamInfo.id;return tracks[id] && tracks[id][type] && isTracksEqual(tracks[id][type].current,track);} /**
     * @param {MediaInfo} track
     * @memberof MediaController#
     */function setTrack(track){if(!track)return;var type=track.type;var streamInfo=track.streamInfo;var id=streamInfo.id;var current=getCurrentTrackFor(type,streamInfo);if(!tracks[id] || !tracks[id][type] || current && isTracksEqual(track,current))return;tracks[id][type].current = track;if(current){eventBus.trigger(_coreEventsEvents2['default'].CURRENT_TRACK_CHANGED,{oldMediaInfo:current,newMediaInfo:track,switchMode:switchMode[type]});}var settings=extractSettings(track);if(!settings || !tracks[id][type].storeLastSettings)return;if(settings.roles){settings.role = settings.roles[0];delete settings.roles;}if(settings.accessibility){settings.accessibility = settings.accessibility[0];}if(settings.audioChannelConfiguration){settings.audioChannelConfiguration = settings.audioChannelConfiguration[0];}domStorage.setSavedMediaSettings(type,settings);} /**
     * @param {string} type
     * @param {Object} value
     * @memberof MediaController#
     */function setInitialSettings(type,value){if(!type || !value)return;initialSettings[type] = value;} /**
     * @param {string} type
     * @returns {Object|null}
     * @memberof MediaController#
     */function getInitialSettings(type){if(!type)return null;return initialSettings[type];} /**
     * @param {string} type
     * @param {string} mode
     * @memberof MediaController#
     */function setSwitchMode(type,mode){var isModeSupported=validTrackSwitchModes.indexOf(mode) !== -1;if(!isModeSupported){log('track switch mode is not supported: ' + mode);return;}switchMode[type] = mode;} /**
     * @param {string} type
     * @returns {string} mode
     * @memberof MediaController#
     */function getSwitchMode(type){return switchMode[type];} /**
     * @param {string} mode
     * @memberof MediaController#
     */function setSelectionModeForInitialTrack(mode){var isModeSupported=validTrackSelectionModes.indexOf(mode) !== -1;if(!isModeSupported){log('track selection mode is not supported: ' + mode);return;}selectionMode = mode;} /**
     * @returns {string} mode
     * @memberof MediaController#
     */function getSelectionModeForInitialTrack(){return selectionMode || DEFAULT_INIT_TRACK_SELECTION_MODE;} /**
     * @param {string} type
     * @returns {boolean}
     * @memberof MediaController#
     */function isMultiTrackSupportedByType(type){return type === _constantsConstants2['default'].AUDIO || type === _constantsConstants2['default'].VIDEO || type === _constantsConstants2['default'].TEXT || type === _constantsConstants2['default'].FRAGMENTED_TEXT || type === _constantsConstants2['default'].IMAGE;} /**
     * @param {MediaInfo} t1 - first track to compare
     * @param {MediaInfo} t2 - second track to compare
     * @returns {boolean}
     * @memberof MediaController#
     */function isTracksEqual(t1,t2){var sameId=t1.id === t2.id;var sameViewpoint=t1.viewpoint === t2.viewpoint;var sameLang=t1.lang === t2.lang;var sameRoles=t1.roles.toString() === t2.roles.toString();var sameAccessibility=t1.accessibility.toString() === t2.accessibility.toString();var sameAudioChannelConfiguration=t1.audioChannelConfiguration.toString() === t2.audioChannelConfiguration.toString();return sameId && sameViewpoint && sameLang && sameRoles && sameAccessibility && sameAudioChannelConfiguration;}function setConfig(config){if(!config)return;if(config.errHandler){errHandler = config.errHandler;}if(config.domStorage){domStorage = config.domStorage;}} /**
     * @memberof MediaController#
     */function reset(){tracks = {};resetInitialSettings();resetSwitchMode();}function extractSettings(mediaInfo){var settings={lang:mediaInfo.lang,viewpoint:mediaInfo.viewpoint,roles:mediaInfo.roles,accessibility:mediaInfo.accessibility,audioChannelConfiguration:mediaInfo.audioChannelConfiguration};var notEmpty=settings.lang || settings.viewpoint || settings.role && settings.role.length > 0 || settings.accessibility && settings.accessibility.length > 0 || settings.audioChannelConfiguration && settings.audioChannelConfiguration.length > 0;return notEmpty?settings:null;}function matchSettings(settings,track){var matchLang=!settings.lang || settings.lang === track.lang;var matchViewPoint=!settings.viewpoint || settings.viewpoint === track.viewpoint;var matchRole=!settings.role || !!track.roles.filter(function(item){return item === settings.role;})[0];var matchAccessibility=!settings.accessibility || !!track.accessibility.filter(function(item){return item === settings.accessibility;})[0];var matchAudioChannelConfiguration=!settings.audioChannelConfiguration || !!track.audioChannelConfiguration.filter(function(item){return item === settings.audioChannelConfiguration;})[0];return matchLang && matchViewPoint && matchRole && matchAccessibility && matchAudioChannelConfiguration;}function resetSwitchMode(){switchMode = {audio:TRACK_SWITCH_MODE_ALWAYS_REPLACE,video:TRACK_SWITCH_MODE_NEVER_REPLACE};}function resetInitialSettings(){initialSettings = {audio:null,video:null};}function selectInitialTrack(tracks){var mode=getSelectionModeForInitialTrack();var tmpArr=[];var getTracksWithHighestBitrate=function getTracksWithHighestBitrate(trackArr){var max=0;var result=[];var tmp=undefined;trackArr.forEach(function(track){tmp = Math.max.apply(Math,track.bitrateList.map(function(obj){return obj.bandwidth;}));if(tmp > max){max = tmp;result = [track];}else if(tmp === max){result.push(track);}});return result;};var getTracksWithWidestRange=function getTracksWithWidestRange(trackArr){var max=0;var result=[];var tmp=undefined;trackArr.forEach(function(track){tmp = track.representationCount;if(tmp > max){max = tmp;result = [track];}else if(tmp === max){result.push(track);}});return result;};switch(mode){case TRACK_SELECTION_MODE_HIGHEST_BITRATE:tmpArr = getTracksWithHighestBitrate(tracks);if(tmpArr.length > 1){tmpArr = getTracksWithWidestRange(tmpArr);}break;case TRACK_SELECTION_MODE_WIDEST_RANGE:tmpArr = getTracksWithWidestRange(tracks);if(tmpArr.length > 1){tmpArr = getTracksWithHighestBitrate(tracks);}break;default:log('track selection mode is not supported: ' + mode);break;}return tmpArr[0];}function createTrackInfo(){return {audio:{list:[],storeLastSettings:true,current:null},video:{list:[],storeLastSettings:true,current:null},text:{list:[],storeLastSettings:true,current:null},fragmentedText:{list:[],storeLastSettings:true,current:null},image:{list:[],storeLastSettings:true,current:null}};}instance = {checkInitialMediaSettingsForType:checkInitialMediaSettingsForType,addTrack:addTrack,getTracksFor:getTracksFor,getCurrentTrackFor:getCurrentTrackFor,isCurrentTrack:isCurrentTrack,setTrack:setTrack,setInitialSettings:setInitialSettings,getInitialSettings:getInitialSettings,setSwitchMode:setSwitchMode,getSwitchMode:getSwitchMode,setSelectionModeForInitialTrack:setSelectionModeForInitialTrack,getSelectionModeForInitialTrack:getSelectionModeForInitialTrack,isMultiTrackSupportedByType:isMultiTrackSupportedByType,isTracksEqual:isTracksEqual,setConfig:setConfig,reset:reset};setup();return instance;}MediaController.__dashjs_factory_name = 'MediaController';var factory=_coreFactoryMaker2['default'].getSingletonFactory(MediaController);factory.TRACK_SWITCH_MODE_NEVER_REPLACE = TRACK_SWITCH_MODE_NEVER_REPLACE;factory.TRACK_SWITCH_MODE_ALWAYS_REPLACE = TRACK_SWITCH_MODE_ALWAYS_REPLACE;factory.TRACK_SELECTION_MODE_HIGHEST_BITRATE = TRACK_SELECTION_MODE_HIGHEST_BITRATE;factory.TRACK_SELECTION_MODE_WIDEST_RANGE = TRACK_SELECTION_MODE_WIDEST_RANGE;factory.DEFAULT_INIT_TRACK_SELECTION_MODE = DEFAULT_INIT_TRACK_SELECTION_MODE;_coreFactoryMaker2['default'].updateSingletonFactory(MediaController.__dashjs_factory_name,factory);exports['default'] = factory;module.exports = exports['default'];
//# sourceMappingURL=MediaController.js.map
