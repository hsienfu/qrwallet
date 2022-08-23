/// <reference types="node" />
declare module '@solana/web3.js' {
  import {Buffer} from 'buffer';

  export class Struct {
    constructor(properties: any);
    encode(): Buffer;
    static decode(data: Buffer): any;
    static decodeUnchecked(data: Buffer): any;
  }

  /**
   * Maximum length of derived pubkey seed
   */
  export const MAX_SEED_LENGTH = 32;
  /**
   * Size of public key in bytes
   */
  export const PUBLIC_KEY_LENGTH = 32;
  /**
   * Value to be converted into public key
   */
  export type PublicKeyInitData =
    | number
    | string
    | Buffer
    | Uint8Array
    | Array<number>
    | PublicKeyData;
  /**
   * JSON object representation of PublicKey class
   */
  export type PublicKeyData = {};
  /**
   * A public key
   */
  export class PublicKey extends Struct {
    /**
     * Create a new PublicKey object
     * @param value ed25519 public key as buffer or base-58 encoded string
     */
    constructor(value: PublicKeyInitData);
    /**
     * Default public key value. (All zeros)
     */
    static default: PublicKey;
    /**
     * Checks if two publicKeys are equal
     */
    equals(publicKey: PublicKey): boolean;
    /**
     * Return the base-58 representation of the public key
     */
    toBase58(): string;
    toJSON(): string;
    /**
     * Return the byte array representation of the public key
     */
    toBytes(): Uint8Array;
    /**
     * Return the Buffer representation of the public key
     */
    toBuffer(): Buffer;
    /**
     * Return the base-58 representation of the public key
     */
    toString(): string;
  }

  /**
   * Keypair signer interface
   */
  interface Signer {
    publicKey: PublicKey;
    secretKey: Uint8Array;
  }
  /**
   * Ed25519 Keypair
   */
  interface Ed25519Keypair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }
  /**
   * An account keypair used for signing transactions.
   */
  export class Keypair {
    private _keypair;
    /**
     * Create a new keypair instance.
     * Generate random keypair if no {@link Ed25519Keypair} is provided.
     *
     * @param keypair ed25519 keypair
     */
    constructor(keypair?: Ed25519Keypair);
    /**
     * Generate a new random keypair
     */
    static generate(): Keypair;
    /**
     * Create a keypair from a raw secret key byte array.
     *
     * This method should only be used to recreate a keypair from a previously
     * generated secret key. Generating keypairs from a random seed should be done
     * with the {@link Keypair.fromSeed} method.
     *
     * @throws error if the provided secret key is invalid and validation is not skipped.
     *
     * @param secretKey secret key byte array
     * @param options: skip secret key validation
     */
    static fromSecretKey(
      secretKey: Uint8Array,
      options?: {
        skipValidation?: boolean;
      },
    ): Keypair;
    /**
     * Generate a keypair from a 32 byte seed.
     *
     * @param seed seed byte array
     */
    static fromSeed(seed: Uint8Array): Keypair;
    /**
     * The public key for this keypair
     */
    get publicKey(): PublicKey;
    /**
     * The raw secret key for this keypair
     */
    get secretKey(): Uint8Array;
  }

  /**
   * There are 1-billion lamports in one SOL
   */
  export const LAMPORTS_PER_SOL = 1000000000;
}
