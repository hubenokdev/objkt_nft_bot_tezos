import { notifyRemainNFTs, delay } from "./module.js";

async function main() {
    while (1) {
        await notifyRemainNFTs()
        await delay(30000)
    }
}

main()