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
 */
import ThroughputRule from './ThroughputRule';
import InsufficientBufferRule from './InsufficientBufferRule';
import AbandonRequestsRule from './AbandonRequestsRule';
import DroppedFramesRule from './DroppedFramesRule';
import SwitchHistoryRule from './SwitchHistoryRule';
import BolaRule from './BolaRule';
import FactoryMaker from '../../../core/FactoryMaker';
import SwitchRequest from '../SwitchRequest';

const QUALITY_SWITCH_RULES = 'qualitySwitchRules';
const ABANDON_FRAGMENT_RULES = 'abandonFragmentRules';

function ABRRulesCollection(config) {

    config = config || {};
    const context = this.context;

    const mediaPlayerModel = config.mediaPlayerModel;
    const metricsModel = config.metricsModel;
    const dashMetrics = config.dashMetrics;

    let instance,
        qualitySwitchRules,
        abandonFragmentRules;

    function initialize() {
        qualitySwitchRules = [];
        abandonFragmentRules = [];

        if (mediaPlayerModel.getUseDefaultABRRules()) {
            // Only one of BolaRule and ThroughputRule will give a switchRequest.quality !== SwitchRequest.NO_CHANGE.
            // This is controlled by useBufferOccupancyABR mechanism in AbrController.
            qualitySwitchRules.push(
                BolaRule(context).create({
                    metricsModel: metricsModel,
                    dashMetrics: dashMetrics,
                    mediaPlayerModel: mediaPlayerModel
                })
            );
            qualitySwitchRules.push(
                ThroughputRule(context).create({
                    metricsModel: metricsModel,
                    dashMetrics: dashMetrics
                })
            );
            qualitySwitchRules.push(
                InsufficientBufferRule(context).create({
                    metricsModel: metricsModel,
                    dashMetrics: dashMetrics
                })
            );
            qualitySwitchRules.push(
                SwitchHistoryRule(context).create()
            );
            qualitySwitchRules.push(
                DroppedFramesRule(context).create()
            );
            abandonFragmentRules.push(
                AbandonRequestsRule(context).create({
                    metricsModel: metricsModel,
                    dashMetrics: dashMetrics,
                    mediaPlayerModel: mediaPlayerModel
                })
            );
        }

        // add custom ABR rules if any
        const customRules = mediaPlayerModel.getABRCustomRules();
        customRules.forEach(function (rule) {
            if (rule.type === QUALITY_SWITCH_RULES) {
                qualitySwitchRules.push(rule.rule(context).create());
            }

            if (rule.type === ABANDON_FRAGMENT_RULES) {
                abandonFragmentRules.push(rule.rule(context).create());
            }
        });
    }

    function getActiveRules(srArray) {
        return srArray.filter(sr => sr.quality > SwitchRequest.NO_CHANGE);
    }

    function getMinSwitchRequest(srArray) {
        const values = {};
        let i,
            len,
            req,
            newQuality,
            quality;

        if (srArray.length === 0) {
            return;
        }

        values[SwitchRequest.PRIORITY.STRONG] = SwitchRequest.NO_CHANGE;
        values[SwitchRequest.PRIORITY.WEAK] = SwitchRequest.NO_CHANGE;
        values[SwitchRequest.PRIORITY.DEFAULT] = SwitchRequest.NO_CHANGE;

        for (i = 0, len = srArray.length; i < len; i += 1) {
            req = srArray[i];
            if (req.quality !== SwitchRequest.NO_CHANGE) {
                values[req.priority] = values[req.priority] > SwitchRequest.NO_CHANGE ? Math.min(values[req.priority], req.quality) : req.quality;
            }
        }

        if (values[SwitchRequest.PRIORITY.WEAK] !== SwitchRequest.NO_CHANGE) {
            newQuality = values[SwitchRequest.PRIORITY.WEAK];
        }

        if (values[SwitchRequest.PRIORITY.DEFAULT] !== SwitchRequest.NO_CHANGE) {
            newQuality = values[SwitchRequest.PRIORITY.DEFAULT];
        }

        if (values[SwitchRequest.PRIORITY.STRONG] !== SwitchRequest.NO_CHANGE) {
            newQuality = values[SwitchRequest.PRIORITY.STRONG];
        }

        if (newQuality !== SwitchRequest.NO_CHANGE) {
            quality = newQuality;
        }

        return SwitchRequest(context).create(quality);
    }

    function getMaxQuality(rulesContext) {
        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = rulesContext.getMediaType();
        const metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
        const streamProcessor = rulesContext.getStreamProcessor();
        const abrController = rulesContext.getAbrController();
        const streamInfo = rulesContext.getStreamInfo();

        const isDynamic = streamInfo && streamInfo.manifestInfo ? streamInfo.manifestInfo.isDynamic : null;
        const throughputHistory1 = abrController.getThroughputHistory();
        const throughput = throughputHistory1.getSafeAverageThroughput(mediaType, isDynamic);
        const latency = abrController.getThroughputHistory().getAverageLatency(mediaType);

        let bitrates = [];
        let bitrateLevelCount;
        let i;
        let bufferLevel = dashMetrics.getCurrentBufferLevel(metrics);

        bitrateLevelCount = rulesContext.getMediaInfo().representationCount;
        for (i = 0; i < bitrateLevelCount; i += 1) {
            bitrates.push(rulesContext.getMediaInfo().bitrateList[i].bandwidth / 1000);
        }

        const switchRequestArray = qualitySwitchRules.map(rule => rule.getMaxIndex(rulesContext));
        const activeRules = getActiveRules(switchRequestArray);
        const maxQuality = getMinSwitchRequest(activeRules);
        let q = maxQuality || SwitchRequest(context).create();

        if(mediaType === "video") {
            timeHistory.push(new Date().getTime() / 1000 - startTime);
            throughputHistory.push(isNaN(throughput / 1000) ? 0 : throughput / 1000);
            bufferHistory.push(bufferLevel);

            if(!isNaN(bitrates[q.quality])) {
                bitrateHistory.push(bitrates[q.quality] / 1000);
            } else {
                bitrateHistory.push(bitrates[3] / 1000);
            }

            if(!isNaN(latency)) {
                latencyHistory.push(latency);
            } else {
                latencyHistory.push(-1);
            }
        }

        if(print === 1) {
            let msg;
            msg = "";
            msg += "buffer_occupancy_x = [" + bufferHistory_x.toString() + "]" + "\n";
            msg += "buffer_occupancy_y = [" + bufferHistory.toString() + "]" + "\n"

            msg += "throughput_x = [" + timeHistory.toString() + "]" + "\n";
            msg += "throughput_y = [" + throughputHistory.toString() + "]" + "\n"

            msg += "bitrate_x = [" + timeHistory.toString() + "]" + "\n";
            msg += "bitrate_y = [" + bitrateHistory.toString() + "]" + "\n"

            msg += "draw_plot(buffer_occupancy_x, buffer_occupancy_y, throughput_x, throughput_y, bitrate_x, bitrate_y)" + "\n";

            msg += "print('throughput avg = ' + str(np.average(throughput_y)))" + "\n";
            msg += "print('bitrate avg = ' + str(np.average(bitrate_y)))";

            console.log(msg);
        }

        return q;
    }

    function shouldAbandonFragment(rulesContext) {
        const abandonRequestArray = abandonFragmentRules.map(rule => rule.shouldAbandon(rulesContext));
        const activeRules = getActiveRules(abandonRequestArray);
        const shouldAbandon = getMinSwitchRequest(activeRules);

        return shouldAbandon || SwitchRequest(context).create();
    }

    function reset() {
        [qualitySwitchRules, abandonFragmentRules].forEach(rules => {
            if (rules && rules.length) {
                rules.forEach(rule => rule.reset && rule.reset());
            }
        });
        qualitySwitchRules = [];
        abandonFragmentRules = [];
    }

    instance = {
        initialize: initialize,
        reset: reset,
        getMaxQuality: getMaxQuality,
        shouldAbandonFragment: shouldAbandonFragment
    };

    return instance;
}

ABRRulesCollection.__dashjs_factory_name = 'ABRRulesCollection';
const factory = FactoryMaker.getClassFactory(ABRRulesCollection);
factory.QUALITY_SWITCH_RULES = QUALITY_SWITCH_RULES;
factory.ABANDON_FRAGMENT_RULES = ABANDON_FRAGMENT_RULES;
FactoryMaker.updateSingletonFactory(ABRRulesCollection.__dashjs_factory_name, factory);

export default factory;
