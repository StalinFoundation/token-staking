import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type NftItemConfig = {
    index: number,
    master: Address
};

export function nftItemConfigToCell(config: NftItemConfig): Cell {
    return beginCell().storeUint(config.index, 64).storeAddress(config.master).endCell();
}

export class NftItem implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new NftItem(address);
    }

    static createFromConfig(config: NftItemConfig, code: Cell, workchain = 0) {
        const data = nftItemConfigToCell(config);
        const init = { code, data };
        return new NftItem(contractAddress(workchain, init), init);
    }

    async sendBurn(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0x55521d04, 32).storeUint(123, 64).endCell()
        })
    }

    // get methods

    async getNftContent(provider: ContractProvider) {
        let res = await provider.get('get_nft_content', []);
        return {
            lockup_time: res.stack.readNumber(),
            locked_amount: res.stack.readBigNumber(),
            index: res.stack.readNumber()
        }
    }
    
    async getOwner(provider: ContractProvider) {
        const result = await provider.get('get_nft_data', []);
        result.stack.readBigNumber()
        result.stack.readBigNumber()
        result.stack.readAddress()
        return result.stack.readAddress()
    }
}
