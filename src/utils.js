const nacl = require('tweetnacl');
const bs58 = require('bs58');
const { createHmac } = require('crypto');
const { Keypair } = require('@solana/keypair.js');
const { join: path_join } = require('path');
const { mkdir, writeFile } = require('fs/promises');
const { Op, fn, col } = require('sequelize');
const { Keypairs, Signatures, sequelize } = require('./model');

function hmac(params, secret) {
  const entities = Object.entries(params).filter(([ k, v ]) => {
    // 不加密`sign`字段 & 空值
    return k !== 'sign' && v;
  }).sort(([ a ], [ b ]) => {
    if (a > b) {
      return 1;
    }

    if (a < b) {
      return -1;
    }

    return 0;
  }).map(([ k, v]) => {
    return k + '=' + v;
  }).join('&');

  const hash = createHmac('sha256', secret);
  hash.update(entities);
  return bs58.encode(hash.digest());
}

async function sign(params) {
  try {
    const signers = await Keypairs.findAll({
      where: {
        'pubkey': {[ Op.in ]: params.pubkeys.split(',')},
      },
    }).then(rows => rows.map(row => {
      return Keypair.fromSecretKey(
        bs58.decode(row.secret_key)
      );
    }));

    if (!signers.length) {
      return new Error('signer is empty');
    }

    const signatures = [];
    const tx_buffer = bs58.decode(params.tx_buffer);

    for (let signer of signers) {
      let p = signer.publicKey.toBase58();
      let s = bs58.encode(nacl.sign.detached(tx_buffer, signer.secretKey));
      signatures.push(`${p}=${s}`);
    }
    return signatures;

  } catch(err) { return err; }
}

async function txHandler(params, secret) {
  const { uuid, tx_buffer, pubkeys } = params;

  // 请求校验出错
  if (params.sign !== hmac(params, secret)) {
    throw new Error('unauthorized request');
  }

  // 生成签名
  const result = await sign(params);

  // 调用方可主动查询出错原因
  if (result instanceof Error) {
    return Signatures.upsert({
      'uuid':       uuid,
      'tx_buffer':  tx_buffer,
      'result':     result.message,
    });
  }

  return Signatures.upsert({
    'uuid':       uuid,
    'tx_buffer':  tx_buffer,
    'signature':  result.join(','),
    'result':     'SUCCESS',
  });
}

async function genKeypair() {
  const keypair   = Keypair.generate();
  const pubkey    = keypair.publicKey.toBase58();
  const secretKey = bs58.encode(keypair.secretKey);
  const keystore  = path_join(__dirname, `./keystore`);
  const filename  = path_join(keystore, `${pubkey}.json`);

  const result = await Promise.all([
    // 生成备份文件
    mkdir(keystore, { recursive: true }).then(() =>
      writeFile(filename, `[${keypair.secretKey.toString()}]`, {
        mode: 0o600,
      })
    ),

    // 写数据库
    Keypairs.create({
      'pubkey':     pubkey,
      'secret_key': secretKey,
    })
  ]).catch(err => err);

  if (result instanceof Error) {
    return result;
  }

  return pubkey;
}

module.exports = { bs58, hmac, sign, txHandler, genKeypair };
