import type { Plugin, IAgentRuntime, ServiceTypeName } from '@elizaos/core';

import { JupiterService } from './service';

export const jupiterPlugin: Plugin = {
  name: 'jupiter',
  description: 'jupiter dex swap plugin',
  services: [JupiterService],
  init: async (_, runtime: IAgentRuntime) => {

    // extensions
    Promise.all(
      ['chain_solana', 'jupiter'].map(
        p => runtime.getServiceLoadPromise(p as ServiceTypeName)
      )
    ).then(() => {
      const solanaService = runtime.getService('chain_solana') as any;
      const me = {
        name: 'Jupiter DEX services',
      };
      solanaService.registerExchange(me);
    }).catch(e => {
      console.error('jupiter::init - err', e)
    })
  },
};

export default jupiterPlugin;
export { JupiterService } from './service';
