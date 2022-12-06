import { buyAndTransfer, delay } from "./module.js";

async function main() {
    while (1) {
        await buyAndTransfer()
        console.info("Please press Ctrl+C to stop purchasing NFT!")
        await delay(3000)
    }
}

main()