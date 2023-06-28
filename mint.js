import { Transaction, SystemProgram, Keypair, Connection,
    PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";

import { MINT_SIZE, TOKEN_PROGRAM_ID, createInitializeMintInstruction,
     getMinimumBalanceForRentExemptMint, getAssociatedTokenAddress, 
     createAssociatedTokenAccountInstruction, createMintToInstruction } from '@solana/spl-token';

import {  createCreateMetadataAccountV3Instruction } from '@metaplex-foundation/mpl-token-metadata';

import { bundlrStorage, keypairIdentity, Metaplex } from '@metaplex-foundation/js';

import secret from './guideSecret.json' assert { type: "json" };

const endpoint = "https://autumn-empty-mountain.solana-devnet.discover.quiknode.pro/bc4d99cc3ae53a78fdcd9496e00f2679ba34045a/"

const solanaConnection = new Connection(endpoint);

const userWallet = Keypair.fromSecretKey(new Uint8Array(secret));

const metaplex = Metaplex.make(solanaConnection)
    .use(keypairIdentity(userWallet))
    .use(bundlrStorage(
        {
            address: 'https://devnet.bundlr.network',
            providerUrl: endpoint,
            timeout: 60000
        }
    ));

    const MINT_CONFIG = {
        numDecimals: 6,
        numberTokens: 1337
    }

    const MY_TOKEN_METADATA = {
        name: "Simple Panas",
        symbol: "SP",
        description: "Token for this tutorial",
        image: "https://arweave.net/z-QtDlbR0bzw6DMkTPkB1h3XPyR0YUiteaI0fSyF9Ok?ext=png" 
    }

    const ON_CHAIN_METADATA = {
        name: MY_TOKEN_METADATA.name, 
        symbol: MY_TOKEN_METADATA.symbol,
        uri: 'TO_UPDATE_LATER',
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null
    } 

    const createNewMintTransaction = async (connection, payer, 
        mintKeypair,  destinationWallet, mintAuthority, freezeAuthority) =>{
        const requiredBalance = await getMinimumBalanceForRentExemptMint(connection);
        const metadataPDA = await metaplex.nfts().pdas().metadata({ mint: mintKeypair.publicKey });
        const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, destinationWallet);   

        const createNewTokenTransaction = new Transaction().add(
            SystemProgram.createAccount({
                fromPubkey: payer.publicKey,
                newAccountPubkey: mintKeypair.publicKey,
                space: MINT_SIZE,
                lamports: requiredBalance,
                programId: TOKEN_PROGRAM_ID,
            }),
            createInitializeMintInstruction(
                mintKeypair.publicKey, //Mint Address
                MINT_CONFIG.numDecimals, //Number of Decimals of New mint
                mintAuthority, //Mint Authority
                freezeAuthority, //Freeze Authority
                TOKEN_PROGRAM_ID),
            createAssociatedTokenAccountInstruction(
                    payer.publicKey, //Payer 
                    tokenATA, //Associated token account 
                    payer.publicKey, //token owner
                    mintKeypair.publicKey, //Mint
                  ),
            createMintToInstruction(
                 mintKeypair.publicKey, //Mint
                tokenATA, //Destination Token Account
                 mintAuthority, //Authority
                 MINT_CONFIG.numberTokens * Math.pow(10, MINT_CONFIG.numDecimals),//number of tokens
                ),
            createCreateMetadataAccountV3Instruction({
                metadata: metadataPDA,
                mint: mintKeypair.publicKey,
                mintAuthority: mintAuthority,
                payer: payer.publicKey,
                updateAuthority: mintAuthority,
                }, {
                createMetadataAccountArgsV3: {
                data: ON_CHAIN_METADATA,
                isMutable: true,
                collectionDetails: null
                    }
                })
        )

        return createNewTokenTransaction;

    }

    const uploadMetadata = async (tokenMetadata) => {
        const { uri } = await metaplex.nfts().uploadMetadata(tokenMetadata);
        console.log(`Arweave URL: `, uri);
        return uri;
   
    }

    const main = async() => {

        console.log(`---STEP 1: Uploading MetaData---`);
        let balance = await solanaConnection.getBalance(userWallet.publicKey);
        console.log(`${balance } SOL`);

        let metadataUri = await uploadMetadata(MY_TOKEN_METADATA);
        ON_CHAIN_METADATA.uri = metadataUri;

        console.log(`---STEP 2: Creating Mint Transaction---`);
        let mintKeypair = Keypair.generate();   
        console.log(`New Mint Address: `, mintKeypair.publicKey.toString());

        const newMintTransaction = await createNewMintTransaction(
            solanaConnection,
            userWallet,
            mintKeypair,
            userWallet.publicKey,
            userWallet.publicKey,
            userWallet.publicKey,
            );

        console.log(`---STEP 3: Executing Mint Transaction---`);

        let { lastValidBlockHeight, blockhash } = await solanaConnection.getLatestBlockhash('finalized');
        newMintTransaction.recentBlockhash = blockhash;
        newMintTransaction.lastValidBlockHeight = lastValidBlockHeight;
        newMintTransaction.feePayer = userWallet.publicKey;
        const transactionId = await sendAndConfirmTransaction(solanaConnection,newMintTransaction,[userWallet,mintKeypair]); 

        console.log(`Transaction ID: `, transactionId);
        console.log(`Succesfully minted ${MINT_CONFIG.numberTokens} ${ON_CHAIN_METADATA.symbol} to ${userWallet.publicKey.toString()}.`);
        console.log(`View Transaction: https://explorer.solana.com/tx/${transactionId}?cluster=devnet`);
        console.log(`View Token Mint: https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}?cluster=devnet`)

    }

    main();
    