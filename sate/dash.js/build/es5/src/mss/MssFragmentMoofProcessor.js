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
 */ /**
 * @module MssFragmentMoovProcessor
 * @param {Object} config object
 */'use strict';Object.defineProperty(exports,'__esModule',{value:true});function MssFragmentMoofProcessor(config){config = config || {};var instance=undefined;var metricsModel=config.metricsModel;var playbackController=config.playbackController;var ISOBoxer=config.ISOBoxer;var log=config.log;function setup(){}function processTfrf(request,tfrf,tfdt,streamProcessor){var representationController=streamProcessor.getRepresentationController();var representation=representationController.getCurrentRepresentation();var indexHandler=streamProcessor.getIndexHandler();var manifest=representation.adaptation.period.mpd.manifest;var adaptation=manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index]; // Get adaptation's segment timeline (always a SegmentTimeline in Smooth Streaming use case)
var segments=adaptation.SegmentTemplate.SegmentTimeline.S;var entries=tfrf.entry;var entry=undefined,segmentTime=undefined;var segment=null;var type=adaptation.contentType;var t=0;var availabilityStartTime=null;var range=undefined;if(manifest.type !== 'dynamic'){return;}if(entries.length === 0){return;} // Consider only first tfrf entry (to avoid pre-condition failure on fragment info requests)
entry = entries[0]; // Get last segment time
segmentTime = segments[segments.length - 1].tManifest?parseFloat(segments[segments.length - 1].tManifest):segments[segments.length - 1].t; // Check if we have to append new segment to timeline
if(entry.fragment_absolute_time <= segmentTime){ // Update DVR window range
// => set range end to end time of current segment
range = {start:segments[0].t / adaptation.SegmentTemplate.timescale,end:tfdt.baseMediaDecodeTime / adaptation.SegmentTemplate.timescale + request.duration};updateDVR(request.mediaType,range,streamProcessor.getStreamInfo().manifestInfo);return;}log('[MssFragmentMoofProcessor][',type,'] Add new segment - t = ',entry.fragment_absolute_time / 10000000.0);segment = {};segment.t = entry.fragment_absolute_time;segment.d = entry.fragment_duration;segments.push(segment); //
if(manifest.timeShiftBufferDepth && manifest.timeShiftBufferDepth > 0){ // Get timestamp of the last segment
segment = segments[segments.length - 1];t = segment.t; // Determine the segments' availability start time
availabilityStartTime = t - manifest.timeShiftBufferDepth * 10000000; // Remove segments prior to availability start time
segment = segments[0];while(segment.t < availabilityStartTime) {log('[MssFragmentMoofProcessor]Remove segment  - t = ' + segment.t / 10000000.0);segments.splice(0,1);segment = segments[0];} // Update DVR window range
// => set range end to end time of current segment
range = {start:segments[0].t / adaptation.SegmentTemplate.timescale,end:tfdt.baseMediaDecodeTime / adaptation.SegmentTemplate.timescale + request.duration};updateDVR(request.mediaType,range,streamProcessor.getStreamInfo().manifestInfo);}indexHandler.updateSegmentList(representation);}function updateDVR(type,range,manifestInfo){var dvrInfos=metricsModel.getMetricsFor(type).DVRInfo;if(dvrInfos){if(dvrInfos.length === 0 || dvrInfos.length > 0 && range.end > dvrInfos[dvrInfos.length - 1].range.end){log('[MssFragmentMoofProcessor][',type,'] Update DVR Infos [' + range.start + ' - ' + range.end + ']');metricsModel.addDVRInfo(type,playbackController.getTime(),manifestInfo,range);}}} // This function returns the offset of the 1st byte of a child box within a container box
function getBoxOffset(parent,type){var offset=8;var i=0;for(i = 0;i < parent.boxes.length;i++) {if(parent.boxes[i].type === type){return offset;}offset += parent.boxes[i].size;}return offset;}function convertFragment(e,sp){var i=undefined; // e.request contains request description object
// e.response contains fragment bytes
if(!e.response){return;}var isoFile=ISOBoxer.parseBuffer(e.response); // Update track_Id in tfhd box
var tfhd=isoFile.fetch('tfhd');tfhd.track_ID = e.request.mediaInfo.index + 1; // Add tfdt box
var tfdt=isoFile.fetch('tfdt');var traf=isoFile.fetch('traf');if(tfdt === null){tfdt = ISOBoxer.createFullBox('tfdt',traf,tfhd);tfdt.version = 1;tfdt.flags = 0;tfdt.baseMediaDecodeTime = Math.floor(e.request.startTime * e.request.timescale);}var trun=isoFile.fetch('trun'); // Process tfxd boxes
// This box provide absolute timestamp but we take the segment start time for tfdt
var tfxd=isoFile.fetch('tfxd');if(tfxd){tfxd._parent.boxes.splice(tfxd._parent.boxes.indexOf(tfxd),1);tfxd = null;}var tfrf=isoFile.fetch('tfrf');if(tfrf){processTfrf(e.request,tfrf,tfdt,sp);tfrf._parent.boxes.splice(tfrf._parent.boxes.indexOf(tfrf),1);tfrf = null;} // If protected content in PIFF1.1 format (sepiff box = Sample Encryption PIFF)
// => convert sepiff box it into a senc box
// => create saio and saiz boxes (if not already present)
var sepiff=isoFile.fetch('sepiff');if(sepiff !== null){sepiff.type = 'senc';sepiff.usertype = undefined;var _saio=isoFile.fetch('saio');if(_saio === null){ // Create Sample Auxiliary Information Offsets Box box (saio)
_saio = ISOBoxer.createFullBox('saio',traf);_saio.version = 0;_saio.flags = 0;_saio.entry_count = 1;_saio.offset = [0];var saiz=ISOBoxer.createFullBox('saiz',traf);saiz.version = 0;saiz.flags = 0;saiz.sample_count = sepiff.sample_count;saiz.default_sample_info_size = 0;saiz.sample_info_size = [];if(sepiff.flags & 0x02){ // Sub-sample encryption => set sample_info_size for each sample
for(i = 0;i < sepiff.sample_count;i += 1) { // 10 = 8 (InitializationVector field size) + 2 (subsample_count field size)
// 6 = 2 (BytesOfClearData field size) + 4 (BytesOfEncryptedData field size)
saiz.sample_info_size[i] = 10 + 6 * sepiff.entry[i].NumberOfEntries;}}else { // No sub-sample encryption => set default sample_info_size = InitializationVector field size (8)
saiz.default_sample_info_size = 8;}}}tfhd.flags &= 0xFFFFFE; // set tfhd.base-data-offset-present to false
tfhd.flags |= 0x020000; // set tfhd.default-base-is-moof to true
trun.flags |= 0x000001; // set trun.data-offset-present to true
// Update trun.data_offset field that corresponds to first data byte (inside mdat box)
var moof=isoFile.fetch('moof');var length=moof.getLength();trun.data_offset = length + 8; // Update saio box offset field according to new senc box offset
var saio=isoFile.fetch('saio');if(saio !== null){var trafPosInMoof=getBoxOffset(moof,'traf');var sencPosInTraf=getBoxOffset(traf,'senc'); // Set offset from begin fragment to the first IV field in senc box
saio.offset[0] = trafPosInMoof + sencPosInTraf + 16; // 16 = box header (12) + sample_count field size (4)
} // Write transformed/processed fragment into request reponse data
e.response = isoFile.write();}function updateSegmentList(e,sp){ // e.request contains request description object
// e.response contains fragment bytes
if(!e.response){return;}var isoFile=ISOBoxer.parseBuffer(e.response); // Update track_Id in tfhd box
var tfhd=isoFile.fetch('tfhd');tfhd.track_ID = e.request.mediaInfo.index + 1; // Add tfdt box
var tfdt=isoFile.fetch('tfdt');var traf=isoFile.fetch('traf');if(tfdt === null){tfdt = ISOBoxer.createFullBox('tfdt',traf,tfhd);tfdt.version = 1;tfdt.flags = 0;tfdt.baseMediaDecodeTime = Math.floor(e.request.startTime * e.request.timescale);}var tfrf=isoFile.fetch('tfrf');if(tfrf){processTfrf(e.request,tfrf,tfdt,sp);tfrf._parent.boxes.splice(tfrf._parent.boxes.indexOf(tfrf),1);tfrf = null;}}instance = {convertFragment:convertFragment,updateSegmentList:updateSegmentList};setup();return instance;}MssFragmentMoofProcessor.__dashjs_factory_name = 'MssFragmentMoofProcessor';exports['default'] = dashjs.FactoryMaker.getClassFactory(MssFragmentMoofProcessor); /* jshint ignore:line */module.exports = exports['default'];
//# sourceMappingURL=MssFragmentMoofProcessor.js.map
