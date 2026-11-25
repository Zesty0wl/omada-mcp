import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { registerAdoptDeviceTool } from './adoptDevice.js';
import { registerBatchSetSwitchPortNameTool } from './batchSetSwitchPortName.js';
import { registerBatchSetSwitchPortPoeTool } from './batchSetSwitchPortPoe.js';
import { registerBatchSetSwitchPortProfileTool } from './batchSetSwitchPortProfile.js';
import { registerBatchSetSwitchPortStatusTool } from './batchSetSwitchPortStatus.js';
import { registerBlockClientTool } from './blockClient.js';
import { registerCreateFirewallAclTool } from './createFirewallAcl.js';
import { registerCreateLanNetworkTool } from './createLanNetwork.js';
import { registerCreateLanProfileTool } from './createLanProfile.js';
import { registerCreatePoeScheduleTool } from './createPoeSchedule.js';
import { registerCreatePortForwardingTool } from './createPortForwarding.js';
import { registerCreateRebootScheduleTool } from './createRebootSchedule.js';
import { registerDeleteFirewallAclTool } from './deleteFirewallAcl.js';
import { registerDeleteLanNetworkTool } from './deleteLanNetwork.js';
import { registerDeletePoeScheduleTool } from './deletePoeSchedule.js';
import { registerDeletePortForwardingTool } from './deletePortForwarding.js';
import { registerDeleteRebootScheduleTool } from './deleteRebootSchedule.js';
import { registerGenericApiCallTool } from './genericApiCall.js';
import { registerGetCableTestResultsTool } from './getCableTestResults.js';
import { registerGetClientTool } from './getClient.js';
import { registerGetDeviceTool } from './getDevice.js';
import { registerGetFirewallSettingTool } from './getFirewallSetting.js';
import { registerGetFirmwareDetailsTool } from './getFirmwareDetails.js';
import { registerGetInternetInfoTool } from './getInternetInfo.js';
import { registerGetLanNetworkListTool } from './getLanNetworkList.js';
import { registerGetLanProfileListTool } from './getLanProfileList.js';
import { registerGetPortForwardingStatusTool } from './getPortForwardingStatus.js';
import { registerGetRfPlanningTool } from './getRfPlanning.js';
import { registerGetSiteSettingsTool } from './getSiteSettings.js';
import { registerGetSsidDetailTool } from './getSsidDetail.js';
import { registerGetSsidListTool } from './getSsidList.js';
import { registerGetSwitchTool } from './getSwitch.js';
import { registerGetSwitchNetworksTool } from './getSwitchNetworks.js';
import { registerGetSwitchPortsTool } from './getSwitchPorts.js';
import { registerGetSwitchStackDetailTool } from './getSwitchStackDetail.js';
import { registerGetThreatListTool } from './getThreatList.js';
import { registerGetWlanGroupListTool } from './getWlanGroupList.js';
import { registerListClientsTool } from './listClients.js';
import { registerListClientsActivityTool } from './listClientsActivity.js';
import { registerListClientsPastConnectionsTool } from './listClientsPastConnections.js';
import { registerListDevicesTool } from './listDevices.js';
import { registerListDevicesStatsTool } from './listDevicesStats.js';
import { registerListEventsTool } from './listEvents.js';
import { registerListFirewallAclsTool } from './listFirewallAcls.js';
import { registerListIpGroupsTool } from './listIpGroups.js';
import { registerListLogsTool } from './listLogs.js';
import { registerListMostActiveClientsTool } from './listMostActiveClients.js';
import { registerListPoeSchedulesTool } from './listPoeSchedules.js';
import { registerListPortForwardingsTool } from './listPortForwardings.js';
import { registerListRebootSchedulesTool } from './listRebootSchedules.js';
import { registerListRoutesTool } from './listRoutes.js';
import { registerListSitesTool } from './listSites.js';
import { registerListTimeRangesTool } from './listTimeRanges.js';
import { registerRebootDeviceTool } from './rebootDevice.js';
import { registerReconnectClientTool } from './reconnectClient.js';
import { registerSearchDevicesTool } from './searchDevices.js';
import { registerSetDeviceLedTool } from './setDeviceLed.js';
import { registerSetGatewayWanConnectTool } from './setGatewayWanConnect.js';
import { registerSetSiteTimeZoneTool } from './setSiteTimeZone.js';
import { registerSetSwitchNetworksTool } from './setSwitchNetworks.js';
import { registerSetSwitchPortNameTool } from './setSwitchPortName.js';
import { registerSetSwitchPortPoeTool } from './setSwitchPortPoe.js';
import { registerSetSwitchPortProfileTool } from './setSwitchPortProfile.js';
import { registerSetSwitchPortProfileOverrideTool } from './setSwitchPortProfileOverride.js';
import { registerSetSwitchPortStatusTool } from './setSwitchPortStatus.js';
import { registerStartCableTestTool } from './startCableTest.js';
import { registerStartFirmwareUpgradeTool } from './startFirmwareUpgrade.js';
import { registerUnblockClientTool } from './unblockClient.js';
import { registerUpdateClientTool } from './updateClient.js';
import { registerUpdateFirewallSettingTool } from './updateFirewallSetting.js';
import { registerUpdateLanNetworkTool } from './updateLanNetwork.js';
import { registerUpdateLanProfileTool } from './updateLanProfile.js';
import { registerUpdatePoeScheduleTool } from './updatePoeSchedule.js';
import { registerUpdatePortForwardingTool } from './updatePortForwarding.js';
import { registerUpdateRebootScheduleTool } from './updateRebootSchedule.js';
import { registerUpdateSiteSettingsTool } from './updateSiteSettings.js';
import { registerUpdateSwitchPortTool } from './updateSwitchPort.js';

export function registerAllTools(server: McpServer, client: OmadaClient): void {
    // Read tools
    registerListSitesTool(server, client);
    registerListDevicesTool(server, client);
    registerListClientsTool(server, client);
    registerGetDeviceTool(server, client);
    registerGetSwitchStackDetailTool(server, client);
    registerGetClientTool(server, client);
    registerSearchDevicesTool(server, client);
    registerListDevicesStatsTool(server, client);
    registerListMostActiveClientsTool(server, client);
    registerListClientsActivityTool(server, client);
    registerListClientsPastConnectionsTool(server, client);
    registerGetThreatListTool(server, client);
    registerGetInternetInfoTool(server, client);
    registerGetPortForwardingStatusTool(server, client);
    registerGetLanNetworkListTool(server, client);
    registerGetLanProfileListTool(server, client);
    registerGetWlanGroupListTool(server, client);
    registerGetSsidListTool(server, client);
    registerGetSsidDetailTool(server, client);
    registerGetFirewallSettingTool(server, client);
    registerGetSwitchPortsTool(server, client);
    registerGetFirmwareDetailsTool(server, client);
    registerListEventsTool(server, client);
    registerListLogsTool(server, client);
    registerListFirewallAclsTool(server, client);
    registerListIpGroupsTool(server, client);
    registerListRoutesTool(server, client);
    registerListPortForwardingsTool(server, client);
    registerCreatePortForwardingTool(server, client);
    registerUpdatePortForwardingTool(server, client);
    registerDeletePortForwardingTool(server, client);
    registerGetSwitchTool(server, client);
    registerGetCableTestResultsTool(server, client);
    registerGetSwitchNetworksTool(server, client);

    // Write tools
    registerCreateLanNetworkTool(server, client);
    registerUpdateLanNetworkTool(server, client);
    registerDeleteLanNetworkTool(server, client);
    registerCreateLanProfileTool(server, client);
    registerUpdateLanProfileTool(server, client);
    registerUpdateFirewallSettingTool(server, client);
    registerCreateFirewallAclTool(server, client);
    registerDeleteFirewallAclTool(server, client);
    registerUpdateSwitchPortTool(server, client);
    registerUpdateClientTool(server, client);
    registerSetSwitchNetworksTool(server, client);

    // Switch port tools
    registerSetSwitchPortProfileTool(server, client);
    registerSetSwitchPortPoeTool(server, client);
    registerSetSwitchPortNameTool(server, client);
    registerSetSwitchPortStatusTool(server, client);
    registerSetSwitchPortProfileOverrideTool(server, client);
    registerBatchSetSwitchPortProfileTool(server, client);
    registerBatchSetSwitchPortPoeTool(server, client);
    registerBatchSetSwitchPortStatusTool(server, client);
    registerBatchSetSwitchPortNameTool(server, client);
    registerStartCableTestTool(server, client);

    // Action tools
    registerRebootDeviceTool(server, client);
    registerAdoptDeviceTool(server, client);
    registerBlockClientTool(server, client);
    registerUnblockClientTool(server, client);
    registerReconnectClientTool(server, client);
    registerSetDeviceLedTool(server, client);
    registerStartFirmwareUpgradeTool(server, client);
    registerSetGatewayWanConnectTool(server, client);

    // Schedule tools (internal web UI API — require OMADA_WEB_USERNAME/OMADA_WEB_PASSWORD)
    registerListRebootSchedulesTool(server, client);
    registerCreateRebootScheduleTool(server, client);
    registerUpdateRebootScheduleTool(server, client);
    registerDeleteRebootScheduleTool(server, client);
    registerListPoeSchedulesTool(server, client);
    registerCreatePoeScheduleTool(server, client);
    registerUpdatePoeScheduleTool(server, client);
    registerDeletePoeScheduleTool(server, client);
    registerListTimeRangesTool(server, client);

    // AI RF Planning tools (internal web UI API)
    registerGetRfPlanningTool(server, client);

    // Site settings tools (internal web UI API)
    registerGetSiteSettingsTool(server, client);
    registerUpdateSiteSettingsTool(server, client);
    registerSetSiteTimeZoneTool(server, client);

    // Generic escape hatch
    registerGenericApiCallTool(server, client);
}
