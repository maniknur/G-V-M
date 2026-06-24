import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CASY2CBFQ2FO722F5FLMSIUYV5RGFDP2J2N4LU7W7M6P4I7LGM6H3C2P",
  }
} as const

export const MarketplaceError = {
  1: {message:"NotInitialized"},
  2: {message:"BlueprintNotFound"},
  3: {message:"Unauthorized"},
  4: {message:"NoOwnerRecorded"},
  5: {message:"InvalidPrice"},
  6: {message:"AlreadyOwned"},
  7: {message:"AlreadyInitialized"}
}

export type DataKey = {tag: "Admin", values: void} | {tag: "Blueprint", values: readonly [u32]} | {tag: "Ownership", values: readonly [u32]} | {tag: "BlueprintCounter", values: void};


export interface BlueprintInfo {
  creator: string;
  ipfs_hash: string;
  is_verified: boolean;
  price: i128;
}




export interface Client {
  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: ({admin}: {admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a add_blueprint transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  add_blueprint: ({creator, price, ipfs_hash}: {creator: string, price: i128, ipfs_hash: string}, options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a buy_blueprint_nft transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  buy_blueprint_nft: ({token_address, buyer, blueprint_id}: {token_address: string, buyer: string, blueprint_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a verify_blueprint transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  verify_blueprint: ({admin, blueprint_id, status}: {admin: string, blueprint_id: u32, status: boolean}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_blueprint transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_blueprint: ({blueprint_id}: {blueprint_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<BlueprintInfo>>

  /**
   * Construct and simulate a get_owner transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_owner: ({blueprint_id}: {blueprint_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_admin: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAAEE1hcmtldHBsYWNlRXJyb3IAAAAHAAAAAAAAAA5Ob3RJbml0aWFsaXplZAAAAAAAAQAAAAAAAAARQmx1ZXByaW50Tm90Rm91bmQAAAAAAAACAAAAAAAAAAxVbmF1dGhvcml6ZWQAAAADAAAAAAAAAA9Ob093bmVyUmVjb3JkZWQAAAAABAAAAAAAAAAMSW52YWxpZFByaWNlAAAABQAAAAAAAAAMQWxyZWFkeU93bmVkAAAABgAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAAAH",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABAAAAAAAAAAAAAAABUFkbWluAAAAAAAAAQAAAAAAAAAJQmx1ZXByaW50AAAAAAAAAQAAAAQAAAABAAAAAAAAAAlPd25lcnNoaXAAAAAAAAABAAAABAAAAAAAAAAAAAAAEEJsdWVwcmludENvdW50ZXI=",
        "AAAAAQAAAAAAAAAAAAAADUJsdWVwcmludEluZm8AAAAAAAAEAAAAAAAAAAdjcmVhdG9yAAAAABMAAAAAAAAACWlwZnNfaGFzaAAAAAAAABAAAAAAAAAAC2lzX3ZlcmlmaWVkAAAAAAEAAAAAAAAABXByaWNlAAAAAAAACw==",
        "AAAABQAAAAAAAAAAAAAADkJsdWVwcmludEFkZGVkAAAAAAABAAAAD2JsdWVwcmludF9hZGRlZAAAAAABAAAAAAAAAAxibHVlcHJpbnRfaWQAAAAEAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAAEUJsdWVwcmludFZlcmlmaWVkAAAAAAAAAQAAABJibHVlcHJpbnRfdmVyaWZpZWQAAAAAAAIAAAAAAAAADGJsdWVwcmludF9pZAAAAAQAAAAAAAAAAAAAAAZzdGF0dXMAAAAAAAEAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAAF0JsdWVwcmludFB1cmNoYXNlZEV2ZW50AAAAAAEAAAAZYmx1ZXByaW50X3B1cmNoYXNlZF9ldmVudAAAAAAAAAUAAAAAAAAADGJsdWVwcmludF9pZAAAAAQAAAAAAAAAAAAAAAVidXllcgAAAAAAABMAAAAAAAAAAAAAAAVwcmljZQAAAAAAAAsAAAAAAAAAAAAAAAxwbGF0Zm9ybV9mZWUAAAALAAAAAAAAAAAAAAANY3JlYXRvcl9zaGFyZQAAAAAAAAsAAAAAAAAAAg==",
        "AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAANYWRkX2JsdWVwcmludAAAAAAAAAMAAAAAAAAAB2NyZWF0b3IAAAAAEwAAAAAAAAAFcHJpY2UAAAAAAAALAAAAAAAAAAlpcGZzX2hhc2gAAAAAAAAQAAAAAQAAAAQ=",
        "AAAAAAAAAAAAAAARYnV5X2JsdWVwcmludF9uZnQAAAAAAAADAAAAAAAAAA10b2tlbl9hZGRyZXNzAAAAAAAAEwAAAAAAAAAFYnV5ZXIAAAAAAAATAAAAAAAAAAxibHVlcHJpbnRfaWQAAAAEAAAAAA==",
        "AAAAAAAAAAAAAAAQdmVyaWZ5X2JsdWVwcmludAAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAMYmx1ZXByaW50X2lkAAAABAAAAAAAAAAGc3RhdHVzAAAAAAABAAAAAA==",
        "AAAAAAAAAAAAAAANZ2V0X2JsdWVwcmludAAAAAAAAAEAAAAAAAAADGJsdWVwcmludF9pZAAAAAQAAAABAAAH0AAAAA1CbHVlcHJpbnRJbmZvAAAA",
        "AAAAAAAAAAAAAAAJZ2V0X293bmVyAAAAAAAAAQAAAAAAAAAMYmx1ZXByaW50X2lkAAAABAAAAAEAAAAT",
        "AAAAAAAAAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAAT" ]),
      options
    )
  }
  public readonly fromJSON = {
    initialize: this.txFromJSON<null>,
        add_blueprint: this.txFromJSON<u32>,
        buy_blueprint_nft: this.txFromJSON<null>,
        verify_blueprint: this.txFromJSON<null>,
        get_blueprint: this.txFromJSON<BlueprintInfo>,
        get_owner: this.txFromJSON<string>,
        get_admin: this.txFromJSON<string>
  }
}