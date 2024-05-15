import EthCrypto from 'eth-crypto';

let publicKey = EthCrypto.publicKeyByPrivateKey(
    '0x31f01500fb999fe79d19fe9f22d67aad4968a97fa15c1d22281c96357df5feaa'
);

console.log(publicKey);
