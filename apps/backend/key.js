import * as jose from 'jose';


const { publicKey, privateKey } = await jose.generateKeyPair('RS256', { extractable: true });

const exportedPrivateKey = await jose.exportPKCS8(privateKey);
const exportedPublicKey = await jose.exportSPKI(publicKey);

function flattenPEMForEnv(pem) {
  return pem.replace(/\r?\n/g, '\\n');
}

console.log('Private Key');
console.log(flattenPEMForEnv(exportedPrivateKey));
console.log('Public Key');
console.log(flattenPEMForEnv(exportedPublicKey));

console.log('Use it in the .env file');