import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerAllTools } from '../../src/tools/index.js';

describe('tools/index', () => {
    let mockServer: McpServer;
    let mockClient: OmadaClient;

    beforeEach(() => {
        mockServer = {
            registerTool: vi.fn(),
        } as unknown as McpServer;

        mockClient = {} as OmadaClient;
    });

    describe('registerAllTools', () => {
        it('should register all tools with the server', () => {
            registerAllTools(mockServer, mockClient);

            // Verify registerTool was called for each tool
            const expectedTools = [
                'adoptDevice',
                'batchSetSwitchPortName',
                'batchSetSwitchPortPoe',
                'batchSetSwitchPortProfile',
                'batchSetSwitchPortStatus',
                'blockClient',
                'createFirewallAcl',
                'createLanNetwork',
                'createLanProfile',
                'createPoeSchedule',
                'createPortForwarding',
                'createRebootSchedule',
                'deleteFirewallAcl',
                'deleteLanNetwork',
                'deletePoeSchedule',
                'deletePortForwarding',
                'deleteRebootSchedule',
                'genericApiCall',
                'getCableTestResults',
                'getClient',
                'getDevice',
                'getFirewallSetting',
                'getFirmwareDetails',
                'getInternetInfo',
                'getLanNetworkList',
                'getLanProfileList',
                'getPortForwardingStatus',
                'getRfPlanning',
                'getSiteSettings',
                'getSsidDetail',
                'getSsidList',
                'getSwitch',
                'getSwitchNetworks',
                'getSwitchPorts',
                'getSwitchStackDetail',
                'getThreatList',
                'getWlanGroupList',
                'listClients',
                'listClientsActivity',
                'listClientsPastConnections',
                'listDevices',
                'listDevicesStats',
                'listEvents',
                'listFirewallAcls',
                'listIpGroups',
                'listLogs',
                'listMostActiveClients',
                'listPoeSchedules',
                'listPortForwardings',
                'listRebootSchedules',
                'listRoutes',
                'listSites',
                'listTimeRanges',
                'rebootDevice',
                'reconnectClient',
                'searchDevices',
                'setDeviceLed',
                'setGatewayWanConnect',
                'setSiteTimeZone',
                'setSwitchNetworks',
                'setSwitchPortName',
                'setSwitchPortPoe',
                'setSwitchPortProfile',
                'setSwitchPortProfileOverride',
                'setSwitchPortStatus',
                'startCableTest',
                'startFirmwareUpgrade',
                'unblockClient',
                'updateClient',
                'updateFirewallSetting',
                'updateLanNetwork',
                'updateLanProfile',
                'updatePoeSchedule',
                'updatePortForwarding',
                'updateRebootSchedule',
                'updateSiteSettings',
                'updateSwitchPort',
            ];

            for (const tool of expectedTools) {
                expect(mockServer.registerTool).toHaveBeenCalledWith(tool, expect.any(Object), expect.any(Function));
            }

            // Verify total number of tools registered
            expect(mockServer.registerTool).toHaveBeenCalledTimes(expectedTools.length);
        });
    });
});
