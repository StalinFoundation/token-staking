import { Blockchain, SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { Cell, beginCell, toNano } from 'ton-core';
import { TokenStaking } from '../wrappers/TokenStaking';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { JettonMinter, JettonMinterConfig } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import { NftItem } from '../wrappers/NftItem';

describe('TokenStaking', () => {
    let code: Cell;
    let minter_code: Cell;
    let jetton_code: Cell;
    let nft_code: Cell;

    beforeAll(async () => {
        code = await compile('TokenStaking');
        minter_code = await compile('JettonMinter');
        jetton_code = await compile('JettonWallet');
        nft_code = await compile('NftItem');
    });

    let blockchain: Blockchain;
    let tokenStaking: SandboxContract<TokenStaking>;
    let jettonMaster: SandboxContract<JettonMinter>;
    let admin: SandboxContract<TreasuryContract>;
    let user: SandboxContract<TreasuryContract>;
    let jettonStaking: SandboxContract<JettonWallet>;
    let jettonUser: SandboxContract<JettonWallet>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        admin = await blockchain.treasury('admin');
        user = await blockchain.treasury('user');
        tokenStaking = blockchain.openContract(TokenStaking.createFromConfig({owner: admin.address, collection_content: "https://raw.githubusercontent.com/StalinFoundation/Images/main/metadata.json", nft_content: "https://raw.githubusercontent.com/StalinFoundation/Images/main/", numerator: 11, denominator: 1000, royalty_address: admin.address, nft_item_code: nft_code}, code));
        jettonMaster = blockchain.openContract(JettonMinter.createFromConfig({adminAddress: admin.address, content: "", jettonWalletCode: jetton_code}, minter_code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await tokenStaking.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: tokenStaking.address,
            deploy: true,
            success: true,
        });

        const res = await jettonMaster.sendDeploy(deployer.getSender(), toNano(1));
        expect(res.transactions).toHaveTransaction({
            from: deployer.address,
            to: jettonMaster.address,
            deploy: true,
            success: true,
        });

        // console.log(await tokenStaking.getStakingData());
        // console.log(await tokenStaking.getRoyaltyParams());
        console.log(await tokenStaking.getCollectionData());
        // console.log(await tokenStaking.getNftAddressByIndex(0));
        // console.log(await tokenStaking.getNftContent(0, beginCell().endCell()));

        

        jettonStaking = blockchain.openContract(JettonWallet.createFromAddress(await jettonMaster.getWalletAddress(tokenStaking.address)));
        jettonUser = blockchain.openContract(JettonWallet.createFromAddress(await jettonMaster.getWalletAddress(user.address)));
        await jettonMaster.sendMint(admin.getSender(), {toAddress: user.address, jettonAmount: toNano(1500000), queryId: 123, value: toNano(1), amount: toNano("0.5")});
        expect(await jettonUser.getBalance()).toEqual(toNano(1500000));
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and tokenStaking are ready to use
    });
    it('should set jetton address', async () => {
        expect(await tokenStaking.getJettonWalletAddress()).toBeNull();
        await tokenStaking.sendSetJettonWallet(admin.getSender(), toNano(1), jettonStaking.address);
        expect(await tokenStaking.getJettonWalletAddress()).toEqualAddress(jettonStaking.address);
        await tokenStaking.sendSetJettonWallet(admin.getSender(), toNano(1), admin.address);
        expect(await tokenStaking.getJettonWalletAddress()).toEqualAddress(jettonStaking.address);
    });
    it('should set default content', async () => {
        expect(await tokenStaking.getNftContent(0, beginCell().endCell())).toEqual("https://raw.githubusercontent.com/StalinFoundation/Images/main/default.json");
        await tokenStaking.sendChangeUseDefault(admin.getSender(), toNano(1), false);
        expect(await tokenStaking.getNftContent(0, beginCell().endCell())).toEqual("https://raw.githubusercontent.com/StalinFoundation/Images/main/0.json");
        await tokenStaking.sendChangeUseDefault(admin.getSender(), toNano(1), true);
        expect(await tokenStaking.getNftContent(0, beginCell().endCell())).toEqual("https://raw.githubusercontent.com/StalinFoundation/Images/main/default.json");
    });
    it('should receive donate',async () => {
        await tokenStaking.sendSetJettonWallet(admin.getSender(), toNano(1), jettonStaking.address);
        let res = await jettonUser.sendTransfer(user.getSender(), {value: toNano(2), toAddress: tokenStaking.address, queryId: 123, fwdAmount: toNano(1), jettonAmount: toNano(1000), fwdPayload: beginCell().storeUint(0x47bbe425, 32).endCell()});
        expect(res.transactions).toHaveTransaction({
            from: user.address,
            to: jettonUser.address
        });
        expect(res.transactions).toHaveTransaction({
            from: jettonUser.address,
            to: jettonStaking.address
        });
        expect(res.transactions).toHaveTransaction({
            from: jettonStaking.address,
            to: user.address,
            op: 0xd53276db
        });
        expect(BigInt((await tokenStaking.getStakingData()).current_supply)).toEqual(toNano(1000));
        expect(BigInt((await tokenStaking.getStakingData()).current_balance)).toEqual(toNano(1000));
    });
    it('should receive tokens and send nfts back',async () => {
        blockchain.now = 1800000000;
        await tokenStaking.sendSetJettonWallet(admin.getSender(), toNano(1), jettonStaking.address);
        await jettonUser.sendTransfer(user.getSender(), {value: toNano(2), toAddress: tokenStaking.address, queryId: 123, fwdAmount: toNano(1), jettonAmount: toNano(1000000), fwdPayload: beginCell().storeUint(0x47bbe425, 32).endCell()});
        expect(BigInt((await tokenStaking.getStakingData()).current_supply)).toEqual(toNano(1000000));
        expect(BigInt((await tokenStaking.getStakingData()).current_balance)).toEqual(toNano(1000000));
        let res = await jettonUser.sendTransfer(user.getSender(), {value: toNano(2), toAddress: tokenStaking.address, queryId: 123, fwdAmount: toNano(1), jettonAmount: toNano(1000), fwdPayload: beginCell().endCell()});

        let nft = blockchain.openContract(NftItem.createFromConfig({index: 0, master: tokenStaking.address}, nft_code));
        expect((await nft.getNftContent()).locked_amount).toEqual(toNano(1000 + 150));
        expect(await nft.getOwner()).toEqualAddress(user.address);
        expect((await nft.getNftContent()).lockup_time).toEqual(blockchain.now + 3600*24*30);
        expect((await tokenStaking.getStakingData()).current_supply).toEqual(toNano(1000000 - 150));
        expect((await tokenStaking.getStakingData()).current_balance).toEqual(toNano(1000000 + 1000));
    });
    it('should unstake',async () => {
        blockchain.now = 1800000000;
        let balance_before = (await blockchain.getContract(tokenStaking.address)).balance
        await tokenStaking.sendSetJettonWallet(admin.getSender(), toNano(1), jettonStaking.address);
        await jettonUser.sendTransfer(user.getSender(), {value: toNano(2), toAddress: tokenStaking.address, queryId: 123, fwdAmount: toNano(1), jettonAmount: toNano(1000000), fwdPayload: beginCell().storeUint(0x47bbe425, 32).endCell()});
        expect(BigInt((await tokenStaking.getStakingData()).current_supply)).toEqual(toNano(1000000));
        expect(BigInt((await tokenStaking.getStakingData()).current_balance)).toEqual(toNano(1000000));
        await jettonUser.sendTransfer(user.getSender(), {value: toNano(2), toAddress: tokenStaking.address, queryId: 123, fwdAmount: toNano(1), jettonAmount: toNano(1000), fwdPayload: beginCell().endCell()});

        let nft = blockchain.openContract(NftItem.createFromConfig({index: 0, master: tokenStaking.address}, nft_code));

        let res = await nft.sendBurn(user.getSender(), toNano(1));
        expect(res.transactions).toHaveTransaction({
            from: user.address,
            to: nft.address,
            exitCode: 405
        });

        blockchain.now = 1800000000 + 3600*24*30 + 1;
        res = await nft.sendBurn(user.getSender(), toNano(1));
        expect((await blockchain.getContract(nft.address)).accountState?.type ?? "uninit").toEqual("uninit");
        expect(await jettonUser.getBalance()).toEqual(toNano(500000 + 150));
        expect((await tokenStaking.getStakingData()).current_balance).toEqual(toNano(1000000 - 150));
        expect((await tokenStaking.getStakingData()).current_supply).toEqual(toNano(1000000 - 150));
        let balance_after = (await blockchain.getContract(tokenStaking.address)).balance
        expect(balance_after).toBeGreaterThanOrEqual(balance_before);
        // res.transactions.forEach(tr => console.log({from: tr.inMessage?.info.src, to: tr.inMessage?.info.dest, body: tr.inMessage?.body, fees: tr.totalFees}));
    });
    it('should receive tokens and send nfts back',async () => {
        let balance_before = (await blockchain.getContract(tokenStaking.address)).balance
        blockchain.now = 1800000000;
        await tokenStaking.sendSetJettonWallet(admin.getSender(), toNano(1), jettonStaking.address);
        await jettonUser.sendTransfer(user.getSender(), {value: toNano(2), toAddress: tokenStaking.address, queryId: 123, fwdAmount: toNano(1), jettonAmount: toNano(1000000), fwdPayload: beginCell().storeUint(0x47bbe425, 32).endCell()});
        expect(BigInt((await tokenStaking.getStakingData()).current_supply)).toEqual(toNano(1000000));
        expect(BigInt((await tokenStaking.getStakingData()).current_balance)).toEqual(toNano(1000000));
        await jettonUser.sendTransfer(user.getSender(), {value: toNano(2), toAddress: tokenStaking.address, queryId: 123, fwdAmount: toNano(1), jettonAmount: toNano(1000), fwdPayload: beginCell().endCell()});

        let nft = blockchain.openContract(NftItem.createFromConfig({index: 0, master: tokenStaking.address}, nft_code));
        expect((await nft.getNftContent()).locked_amount).toEqual(toNano(1000 + 150));
        expect(await nft.getOwner()).toEqualAddress(user.address);
        expect((await nft.getNftContent()).lockup_time).toEqual(blockchain.now + 3600*24*30);
        expect((await tokenStaking.getStakingData()).current_supply).toEqual(toNano(1000000 - 150));
        expect((await tokenStaking.getStakingData()).current_balance).toEqual(toNano(1000000 + 1000));
        await jettonUser.sendTransfer(user.getSender(), {value: toNano(2), toAddress: tokenStaking.address, queryId: 123, fwdAmount: toNano(1), jettonAmount: toNano(10000), fwdPayload: beginCell().endCell()});
        let nft_2 = blockchain.openContract(NftItem.createFromConfig({index: 1, master: tokenStaking.address}, nft_code));
        expect((await nft_2.getNftContent()).locked_amount).toEqual(toNano(11499.775));
        let balance_after = (await blockchain.getContract(tokenStaking.address)).balance;
        expect(balance_after).toBeGreaterThanOrEqual(balance_before);
    });
});
