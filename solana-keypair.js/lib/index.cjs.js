'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var nacl = require('tweetnacl');
var BN = require('bn.js');
var bs58 = require('bs58');
var buffer = require('buffer');
var borsh = require('borsh');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var nacl__default = /*#__PURE__*/_interopDefaultLegacy(nacl);
var BN__default = /*#__PURE__*/_interopDefaultLegacy(BN);
var bs58__default = /*#__PURE__*/_interopDefaultLegacy(bs58);

class Struct {
  constructor(properties) {
    Object.assign(this, properties);
  }

  encode() {
    return buffer.Buffer.from(borsh.serialize(SOLANA_SCHEMA, this));
  }

  static decode(data) {
    return borsh.deserialize(SOLANA_SCHEMA, this, data);
  }

  static decodeUnchecked(data) {
    return borsh.deserializeUnchecked(SOLANA_SCHEMA, this, data);
  }

} // Class representing a Rust-compatible enum, since enums are only strings or
const SOLANA_SCHEMA = new Map();

/**
 * Maximum length of derived pubkey seed
 */

const MAX_SEED_LENGTH = 32;
/**
 * Size of public key in bytes
 */

const PUBLIC_KEY_LENGTH = 32;
/**
 * Value to be converted into public key
 */

function isPublicKeyData(value) {
  return value._bn !== undefined;
}
/**
 * A public key
 */


class PublicKey extends Struct {
  /** @internal */

  /**
   * Create a new PublicKey object
   * @param value ed25519 public key as buffer or base-58 encoded string
   */
  constructor(value) {
    super({});
    this._bn = void 0;

    if (isPublicKeyData(value)) {
      this._bn = value._bn;
    } else {
      if (typeof value === 'string') {
        // assume base 58 encoding by default
        const decoded = bs58__default["default"].decode(value);

        if (decoded.length != PUBLIC_KEY_LENGTH) {
          throw new Error(`Invalid public key input`);
        }

        this._bn = new BN__default["default"](decoded);
      } else {
        this._bn = new BN__default["default"](value);
      }

      if (this._bn.byteLength() > 32) {
        throw new Error(`Invalid public key input`);
      }
    }
  }
  /**
   * Default public key value. (All zeros)
   */


  /**
   * Checks if two publicKeys are equal
   */
  equals(publicKey) {
    return this._bn.eq(publicKey._bn);
  }
  /**
   * Return the base-58 representation of the public key
   */


  toBase58() {
    return bs58__default["default"].encode(this.toBytes());
  }

  toJSON() {
    return this.toBase58();
  }
  /**
   * Return the byte array representation of the public key
   */


  toBytes() {
    return this.toBuffer();
  }
  /**
   * Return the Buffer representation of the public key
   */


  toBuffer() {
    const b = this._bn.toArrayLike(buffer.Buffer);

    if (b.length === PUBLIC_KEY_LENGTH) {
      return b;
    }

    const zeroPad = buffer.Buffer.alloc(32);
    b.copy(zeroPad, 32 - b.length);
    return zeroPad;
  }
  /**
   * Return the base-58 representation of the public key
   */


  toString() {
    return this.toBase58();
  }

}
PublicKey.default = new PublicKey('11111111111111111111111111111111');
SOLANA_SCHEMA.set(PublicKey, {
  kind: 'struct',
  fields: [['_bn', 'u256']]
});

/**
 * Keypair signer interface
 */

/**
 * An account keypair used for signing transactions.
 */
class Keypair {
  /**
   * Create a new keypair instance.
   * Generate random keypair if no {@link Ed25519Keypair} is provided.
   *
   * @param keypair ed25519 keypair
   */
  constructor(keypair) {
    this._keypair = void 0;

    if (keypair) {
      this._keypair = keypair;
    } else {
      this._keypair = nacl__default["default"].sign.keyPair();
    }
  }
  /**
   * Generate a new random keypair
   */


  static generate() {
    return new Keypair(nacl__default["default"].sign.keyPair());
  }
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


  static fromSecretKey(secretKey, options) {
    const keypair = nacl__default["default"].sign.keyPair.fromSecretKey(secretKey);

    if (!options || !options.skipValidation) {
      const encoder = new TextEncoder();
      const signData = encoder.encode('@solana/web3.js-validation-v1');
      const signature = nacl__default["default"].sign.detached(signData, keypair.secretKey);

      if (!nacl__default["default"].sign.detached.verify(signData, signature, keypair.publicKey)) {
        throw new Error('provided secretKey is invalid');
      }
    }

    return new Keypair(keypair);
  }
  /**
   * Generate a keypair from a 32 byte seed.
   *
   * @param seed seed byte array
   */


  static fromSeed(seed) {
    return new Keypair(nacl__default["default"].sign.keyPair.fromSeed(seed));
  }
  /**
   * The public key for this keypair
   */


  get publicKey() {
    return new PublicKey(this._keypair.publicKey);
  }
  /**
   * The raw secret key for this keypair
   */


  get secretKey() {
    return this._keypair.secretKey;
  }

}

/**
 * There are 1-billion lamports in one SOL
 */

const LAMPORTS_PER_SOL = 1000000000;

exports.Keypair = Keypair;
exports.LAMPORTS_PER_SOL = LAMPORTS_PER_SOL;
exports.MAX_SEED_LENGTH = MAX_SEED_LENGTH;
exports.PUBLIC_KEY_LENGTH = PUBLIC_KEY_LENGTH;
exports.PublicKey = PublicKey;
//# sourceMappingURL=index.cjs.js.map
