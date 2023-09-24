import { Address, beginCell, toNano } from 'ton-core';
import { TokenStaking } from '../wrappers/TokenStaking';
import { compile, NetworkProvider } from '@ton-community/blueprint';
import { JettonWallet } from '../wrappers/JettonWallet';
import { JettonMinter } from '../wrappers/JettonMinter';
import { NftItem } from '../wrappers/NftItem';

export async function run(provider: NetworkProvider) {
    const tokenStaking = provider.open(TokenStaking.createFromConfig({owner: Address.parse("EQDCWAnbip-FJlr71gJKgAVTznR-J_iDW-djThXp43q5qdXw"), collection_content: 'https://raw.githubusercontent.com/StalinFoundation/Images/main/metadata.json', nft_content: 'https://raw.githubusercontent.com/StalinFoundation/Images/main/', nft_item_code: await compile("NftItem"), numerator: 11, denominator: 1000, royalty_address: Address.parse("EQDCWAnbip-FJlr71gJKgAVTznR-J_iDW-djThXp43q5qdXw")}, await compile('TokenStaking')));

    // await tokenStaking.sendDeploy(provider.sender(), toNano('0.05'));

    // const jettonRoot = provider.open(JettonMinter.createFromAddress(Address.parse("EQAbDiNBKXDn5l3AE8cx-j7zZneFITRRFM-FH-HfBJqsrYlr")))
    // await provider.waitForDeploy(tokenStaking.address);
    // const tokenStaking = provider.open(TokenStaking.createFromAddress(Address.parse("EQByEUWHMNsosoaOObKI3aRPLrPKqjOUXv7vbYHKAX5hQl2F")));
    // await tokenStaking.sendSetJettonWallet(provider.sender(), toNano('0.05'), await jettonRoot.getWalletAddress(tokenStaking.address))
    // console.log(await tokenStaking.getJettonWalletAddress())
    // const jetton_wallet = provider.open(JettonWallet.createFromAddress(Address.parse("EQCLDfgyLveixuGJh0NQv6gWBbuj2aVCpiaLjNbjfTjGx-X8")))
    // await jetton_wallet.sendTransfer(provider.sender(), {value: toNano("0.14"), toAddress: tokenStaking.address, queryId: 123, fwdAmount: toNano("0.1"), jettonAmount: toNano(1000), fwdPayload: beginCell().endCell()})
    // run methods on `tokenStaking`
    // console.log(await tokenStaking.getStakingData())
    const nft = provider.open(NftItem.createFromAddress(Address.parse("EQCzc31I2JE-qovQFnLCNKkfEdUBSoc4sKJrES829shQ4qo6")))
    // console.log(await tokenStaking.getNftContent(0, beginCell().endCell()));
    await nft.sendBurn(provider.sender(), toNano("0.12"));
}
