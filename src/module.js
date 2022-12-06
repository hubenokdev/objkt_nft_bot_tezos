import { TezosToolkit } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

function EMPTY(param1, param2, ...param3) {
    return
}

const DEBUG = EMPTY

const provider = 'https://mainnet.api.tez.ie'
const GRAPHQL_API = 'https://data.objkt.com/v3/graphql'
const CONTRACT_ADDRESS = 'KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC'
const DECIMALS = 1000000.0

const FA_CONTRACT = process.env.FA_CONTRACT
const TOKEN_ID = process.env.TOKEN_ID
const PUBLIC_KEY = process.env.PUBLIC_KEY
const PRIVATE_KEY = process.env.PRIVATE_KEY

const GET_TOKEN_INFO = `
query QUERY($limit: Int) {
    token (
        where: {
            fa_contract: {_in: "${FA_CONTRACT}"}
            token_id: {_in: "${TOKEN_ID}"}
        },
        limit: $limit
    ) {
        token_id,
        fa_contract,
        artifact_uri,
        metadata,
        listings (
            where: {
                status: {_in: "active"}
            }
        ) {
            bigmap_key,
            amount,
            amount_left,
            status,
            price
        }
    }
}
`

const GET_FETCH_ACTIVE_NFTS = `
query QUERY($limit: Int) {
    listing (
        order_by: {
            price: asc
        }
        where: {
            marketplace_contract: {_in: ${CONTRACT_ADDRESS}}
            status: {_in: "active"}
            amount_left: {_gte: 1}
        },
        limit: $limit
    ) {
        id,
        bigmap_key,
        amount,
        amount_left,
        status,
        price,
        token {
            fa_contract,
            token_id,
            artifact_uri
        }
    }
}
`

async function fetchGraphQL(operationsDoc, operationName, variables) {
    const result = await fetch(
        GRAPHQL_API,
        {
            method: "POST",
            body: JSON.stringify({
                query: operationsDoc,
                variables: variables,
                operationName: operationName
            })
        }
    );

    return await result.json();
}

async function doFetch(query, limit) {
    const { errors, data } = await fetchGraphQL(query, "QUERY", { "limit": limit });
    if (errors) {
        return { sucess: false, obj: errors }
    } else {
        return { sucess: true, obj: data }
    }
}

export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function buyAndTransfer() {
    const signer = new InMemorySigner(PRIVATE_KEY);
    const tezos = new TezosToolkit(provider)
    tezos.setSignerProvider(signer);

    try {
        DEBUG("    ===Fetch START===");
        const retVal = await doFetch(GET_TOKEN_INFO, 10);
        DEBUG("    ===Fetch END===");
        if (!retVal.sucess) {
            DEBUG("Please check your input parameters!")
            return;
        }

        if (retVal.obj.token.length > 1) {
            DEBUG("Not only 1, you will purchase the first of these.")
        }

        const info = retVal.obj.token[0].listings[0];
        if (info.amount_left > 0 && info.status === "active") {
            DEBUG("    ===Buy START===");
            const contract = await tezos.contract.at(CONTRACT_ADDRESS);
            const op = await contract.methods.fulfill_ask(info.bigmap_key).send({ amount: info.price / DECIMALS })
            await op.confirmation();
            console.info("Purchasing tx:", op.hash, op.includedInBlock);
            DEBUG("    ===Buy END===");
            DEBUG("    ===TransferNFT START===");
            const nftContract = await tezos.contract.at(FA_CONTRACT);
            const from = await signer.publicKeyHash();
            const transOp = await nftContract.methods.transfer(
                [
                    {
                        "from_": from,
                        "txs": [
                            {
                                "to_": PUBLIC_KEY,
                                "token_id": TOKEN_ID,
                                "amount": 1,
                            }
                        ]
                    }
                ]
            ).send()
            await transOp.confirmation();
            console.info("Transfer tx:", transOp.hash, transOp.includedInBlock);
            DEBUG("    ===TransferNFT END===");

        } else {
            DEBUG("Something went wrong! Please check your input parameters!")
        }
    } catch (ex) {
        DEBUG('Something went wrong!')
    }
}

export async function fetchMintableNFTs() {
    try {
        DEBUG("    ===Fetch START===");
        const retVal = await doFetch(GET_FETCH_ACTIVE_NFTS, 30);
        DEBUG("    ===Fetch END===");
        if (!retVal.sucess) {
            DEBUG("Please check your input parameters!")
            return;
        }

        console.info(retVal.obj.listing.map((item) => item.token))
    } catch (ex) {
        DEBUG('Something went wrong!')
    }
}

export async function notifyRemainNFTs() {
    try {
        DEBUG("    ===Fetch START===");
        const retVal = await doFetch(GET_TOKEN_INFO, 10);
        DEBUG("    ===Fetch END===");
        if (!retVal.sucess) {
            DEBUG("Please check your input parameters!")
            return;
        }

        const amount_left = retVal.obj.token[0].listings[0].amount_left;
        console.info(`${amount_left} left!`)
    } catch (ex) {
        DEBUG('Something went wrong!')
    }
}
