import { fetchMintableNFTs, delay } from "./module.js";

async function main() {
    while (1) {
        await fetchMintableNFTs()
        await delay(5000)
    }
}

main()