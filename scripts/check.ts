import {Address, TonClient4} from "ton"
import { TokenStaking } from "../wrappers/TokenStaking";

(async () => {
    let client4 = new TonClient4({
        endpoint: "https://sandbox-v4.tonhubapi.com"
    });
    let coll = client4.open(TokenStaking.createFromAddress(Address.parse("EQByEUWHMNsosoaOObKI3aRPLrPKqjOUXv7vbYHKAX5hQl2F")));
    console.log(await coll.getCollectionData());
})();