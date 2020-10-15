/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable no-unused-vars */

'use strict';

function hex2a(data) {
  const hex = data.toString().replace(/,/g, '');// force conversion and remove comma's
  let str = '';
  for (let i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2) str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  return str;
}

// decimal to hex conversion
function dec2hex4Digit(i) {
  return (i + 0x10000).toString(16).substr(-4).toUpperCase();
} // dec2hex4Digit

// decimal to hex conversion
function dec2hex2Digit(i) {
  return (i + 0x10000).toString(16).substr(-2).toUpperCase();
} // dec2hex2Digit

function hex2dec(i) {
  return parseInt(i, 16);
} // hex2dec

// hex to bin conversion
function hex2bin(hex) {
  return (parseInt(hex, 16).toString(2)).padStart(8, '0');
} // hex2bin

// convert array of bytes to decimal numbers
function byteArrayToDec(ary) {
  const bytes = [];
  for (let c = 0; c < ary.length; c += 1) {
    bytes.push(String.fromCharCode(`0x${ary[c]}`));
  }
  return bytes;
} // byteArrayToDec

// provide string, fill up to 'len' with 'fill' characters and divide into byte pairs
function stringToHexBytes(str, len, fill) {
  str = str.toString(); // force to be string
  if (str.length < (len * 2)) {
    str += fill.repeat((len * 2) - str.length);
  }
  const bytes = [];
  for (let c = 0; c < str.length; c += 2) {
    const blk = str.substr(c, 2);
    bytes.push(blk);
  }
  return bytes;
} // stringToHexBytes

// compare two array to check if they have the same elements
function compareArrays(arrA, arrB) {
  // check if lengths are different
  if (arrA.length !== arrB.length) return false;

  // slice so we do not effect the orginal
  // sort makes sure they are in order
  const cA = arrA.slice().sort();
  const cB = arrB.slice().sort();

  for (let i = 0; i < cA.length; i++) {
    if (cA[i] !== cB[i]) return false;
  }
  return true;
} // compareArrays

// calculate CRC for given cmd according to satel specifications
// https://www.satel.pl/en/download/instrukcje/ethm1_op_pl_1.07.pdf
function calcCRC(array) {
  let crc = '0x147A';
  // loop over decimal version of hex
  for (const b of array) {
    // rotate 1 bit left
    crc = ((crc << 1) & 0xFFFF) | (crc & 0x8000) > 15;
    // xOR with 0xFFFF
    crc ^= 0xFFFF;
    // crc + crc.high + b
    crc = (crc + (crc >> 8) + parseInt(b, 16)) & 0xFFFF;
  }
  return dec2hex4Digit(crc).match(/.{2}/g); // return array
} // calcCRC

function ETHM1AnswerToArray(answer) {
  return Buffer.from(answer.toString('binary'), 'ascii').toString('hex').toUpperCase().match(/.{2}/g);
} // ETHM1AnswerToArray

function verifyAnswer(answer) {
  const frmHdr = 'FE,FE';
  const frmFtr = 'FE,0D';
  if (answer.slice(0, 2).toString() === frmHdr
        && answer.slice(-2).toString() === frmFtr
        && answer.slice(-4, -2).toString() === calcCRC(answer.slice(2, -4)).toString()
  ) {
    return true;
  }
  return false;
} // verifyAnswer

function partitionListToByteArray(partitions, size = 4) {
  const ary = partitions.toString().split(',');
  const byteArray = [];
  for (let i = 0; i < (8 * size); i++) {
    // if index+1 equals partition number, set as 1.
    if (ary.includes((i + 1).toString())) {
      byteArray[i] = 1;
    } else {
      byteArray[i] = 0;
    }
  }
  // split into sections of 8 characters
  const byteList = byteArray.reverse().join('').match(/.{8}/g);
  const partHexList = [];
  for (const b of byteList.reverse()) {
    // convert bin to hex, uppercase and pad left
    partHexList.push(parseInt(b, 2).toString(16).toUpperCase().padStart(2, '0'));
  }
  return partHexList;
} // partitionListToByteArray

function createFrameArray(cmd) {
  // cmd must be array
  // Frame structure
  // [ 0xFE | 0xFE | cmd | d1 | d2 | ... | dn | crc.high | crc.low | 0xFE | 0x0D ]
  const frmHdr = ['FE', 'FE'];
  const frmFtr = ['FE', '0D'];
  const crc = this.calcCRC(cmd);
  return frmHdr.concat(cmd).concat(crc).concat(frmFtr);
} // createFrameArray

module.exports = {
  hex2a, dec2hex4Digit, dec2hex2Digit, hex2dec, hex2bin, byteArrayToDec, stringToHexBytes, compareArrays, calcCRC, ETHM1AnswerToArray, partitionListToByteArray, verifyAnswer, createFrameArray,
};
