import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, TupleBuilder } from 'ton-core';

export type TokenStakingConfig = {
    owner: Address,
    collection_content: string,
    nft_content: string,
    nft_item_code: Cell,
    royalty_address: Address,
    numerator: number,
    denominator: number
};

const OFFCHAIN_CONTENT_PREFIX = 0x01;

const serializeUri = (uri: string) => {
  return new TextEncoder().encode(encodeURI(uri));
}

function create_content(collection_link: string, nft_link: string) {
  const contentBuffer = serializeUri(collection_link);
  const contentBaseBuffer = serializeUri(nft_link);
  var content_cell = beginCell().storeUint(OFFCHAIN_CONTENT_PREFIX, 8);
  contentBuffer.forEach((byte) => {
    content_cell.storeUint(byte, 8);
  })

  var content_base = beginCell()
  contentBaseBuffer.forEach((byte) => {
    content_base.storeUint(byte, 8);
  })
  return beginCell().storeRef(content_cell.endCell()).storeRef(content_base.endCell())
}

export function tokenStakingConfigToCell(config: TokenStakingConfig): Cell {
    return  beginCell()
                .storeAddress(config.owner)
                .storeUint(0, 64)
                .storeAddress(null)
                .storeCoins(0)
                .storeCoins(0)
                .storeBit(1)
                .storeRef(create_content(config.collection_content, config.nft_content))
                .storeRef(config.nft_item_code)
                .storeRef(beginCell().storeUint(config.numerator, 16).storeUint(config.denominator, 16).storeAddress(config.royalty_address).endCell())
            .endCell();
}

export class TokenStaking implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new TokenStaking(address);
    }

    static createFromConfig(config: TokenStakingConfig, code: Cell, workchain = 0) {
        const data = tokenStakingConfigToCell(config);
        const init = { code, data };
        return new TokenStaking(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendChangeOwner(provider: ContractProvider, via: Sender, value: bigint, new_owner: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(3, 32).storeUint(1, 64).storeAddress(new_owner).endCell(),
        });
    }

    async sendSetJettonWallet(provider: ContractProvider, via: Sender, value: bigint, jetton_wallet: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(4, 32).storeUint(1, 64).storeAddress(jetton_wallet).endCell(),
        });
    }

    async sendChangeContent(provider: ContractProvider, via: Sender, value: bigint, content: Cell) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(5, 32).storeUint(1, 64).storeRef(content).endCell(),
        });
    }

    async sendChangeRoyalty(provider: ContractProvider, via: Sender, value: bigint, numerator: number, denominator: number, royalty_address: Address) {
        let royalty_params = beginCell().storeUint(numerator, 16).storeUint(denominator, 16).storeAddress(royalty_address).endCell();
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(6, 32).storeUint(1, 64).storeRef(royalty_params).endCell(),
        });
    }
    async sendChangeUseDefault(provider: ContractProvider, via: Sender, value: bigint, use_default: boolean) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(7, 32).storeUint(1, 64).storeBit(use_default).endCell(),
        });
    }
    // get-methods

    async getStakingData(provider: ContractProvider) {
        const result = await provider.get('get_staking_data', []);
        let current_supply = result.stack.readBigNumber();
        let current_balance = result.stack.readBigNumber();
        let reward_supply = result.stack.readBigNumber();
        let max_percent = result.stack.readNumber();
        let min_percent = result.stack.readNumber();
        let lockup_period = result.stack.readNumber();
        return {current_supply, current_balance, reward_supply, max_percent, min_percent, lockup_period};
    }

    async getCollectionData(provider: ContractProvider) {
        let res = await provider.get('get_collection_data', []);

        return {
            nextItemId: res.stack.readNumber(),
            collectionContent: res.stack.readCell().asSlice().skip(8).loadStringTail(),
            ownerAddress: res.stack.readAddress()
        }
    }

    async getNftAddressByIndex(provider: ContractProvider, index: number): Promise<Address> {
        let tuple = new TupleBuilder();
        tuple.writeNumber(index);
        let res = await provider.get('get_nft_address_by_index', tuple.build());
        return res.stack.readAddress()
    }

    async getRoyaltyParams(provider: ContractProvider) {
        let res = await provider.get('royalty_params', []);

        return {
            royaltyFactor: res.stack.readNumber(),
            royaltyBase: res.stack.readNumber(),
            royaltyAddress: res.stack.readAddress()
        }
    }

    async getNftContent(provider: ContractProvider, index: number, nftIndividualContent: Cell) {
        let tuple = new TupleBuilder();
        tuple.writeNumber(index);
        tuple.writeCell(nftIndividualContent);
        let res = await provider.get('get_nft_content', tuple.build());

        return res.stack.readCell().asSlice().skip(8).loadStringTail();
    }

    async getJettonWalletAddress(provider: ContractProvider) {
        let res = await provider.get('get_jetton_address', []);
        return res.stack.readAddressOpt();
    }
}
