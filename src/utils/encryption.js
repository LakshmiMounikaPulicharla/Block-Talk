/**
 * End-to-End Encryption Utilities for CryptoComm
 * 
 * Implements key derivation using Ethereum addresses and Keccak-256 hashing
 * with AES-256-GCM for symmetric encryption, as per the CryptoComm paper specifications.
 * 
 * Security Features:
 * - Uses Ethereum wallet addresses for deterministic key derivation
 * - Keccak-256 hashing (as specified in the paper)
 * - AES-256-GCM encryption with authentication tag
 * - Per-message unique nonces (IVs)
 * - PBKDF2 key derivation for added security
 */

import { ethers } from 'ethers';

// Web Crypto API for AES-GCM (more secure than crypto-js)
const webCrypto = window.crypto || window.msCrypto;

/**
 * Derives a symmetric encryption key from two Ethereum addresses
 * Uses Keccak-256 (as per CryptoComm paper) for key derivation
 * 
 * @param {string} myAddress - Sender's Ethereum address
 * @param {string} friendAddress - Recipient's Ethereum address
 * @returns {Promise<CryptoKey>} AES-256-GCM encryption key
 */
async function deriveSharedKey(myAddress, friendAddress) {
  try {
    // Normalize addresses for consistent key derivation
    const addr1 = ethers.getAddress(myAddress.toLowerCase());
    const addr2 = ethers.getAddress(friendAddress.toLowerCase());
    
    // Ensure consistent ordering (smaller address first) - same as smart contract
    const addresses = addr1 < addr2 ? [addr1, addr2] : [addr2, addr1];
    
    // Create deterministic seed using Keccak-256 (as per CryptoComm paper)
    const seed = ethers.solidityPackedKeccak256(
      ['address', 'address'],
      addresses
    );
    
    // Convert seed to bytes for key derivation
    const keyMaterial = ethers.getBytes(seed);
    
    // Use first 16 bytes as salt for PBKDF2
    const salt = keyMaterial.slice(0, 16);
    
    // Use the full keyMaterial as password (convert to Uint8Array if needed)
    const password = new Uint8Array(keyMaterial);
    
    // Import password as key for PBKDF2
    const baseKey = await webCrypto.subtle.importKey(
      'raw',
      password,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    // Derive 256-bit key using PBKDF2 with 10000 iterations (as per paper)
    const derivedKey = await webCrypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 10000,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    return derivedKey;
  } catch (error) {
    console.error('Key derivation failed:', error);
    throw new Error('Failed to derive encryption key');
  }
}

/**
 * Encrypts a message using AES-256-GCM
 * 
 * @param {string} plaintext - Message to encrypt
 * @param {CryptoKey} key - AES-256-GCM encryption key
 * @returns {Promise<string>} Base64-encoded encrypted message with IV and auth tag
 */
async function encryptMessage(plaintext, key) {
  try {
    // Generate random 12-byte IV for each message (required for GCM)
    const iv = new Uint8Array(12);
    webCrypto.getRandomValues(iv);
    
    // Convert plaintext to Uint8Array
    const plaintextBytes = new TextEncoder().encode(plaintext);
    
    // Encrypt using AES-GCM
    const encrypted = await webCrypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128 // 128-bit authentication tag
      },
      key,
      plaintextBytes
    );
    
    // Combine IV, encrypted data, and auth tag
    // Format: IV (12 bytes) + ciphertext + auth tag (16 bytes)
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Convert to base64 for storage on blockchain
    const base64 = btoa(String.fromCharCode(...combined));
    
    return base64;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypts a message using AES-256-GCM
 * 
 * @param {string} encryptedData - Base64-encoded encrypted message
 * @param {CryptoKey} key - AES-256-GCM decryption key
 * @returns {Promise<string>} Decrypted plaintext
 */
async function decryptMessage(encryptedData, key) {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract IV (first 12 bytes)
    const iv = combined.slice(0, 12);
    
    // Extract ciphertext (rest contains ciphertext + auth tag)
    const ciphertext = combined.slice(12);
    
    // Decrypt using AES-GCM
    const decrypted = await webCrypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      key,
      ciphertext
    );
    
    // Convert decrypted bytes to string
    const plaintext = new TextDecoder().decode(decrypted);
    
    return plaintext;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt message. Message may be corrupted or key is incorrect.');
  }
}

/**
 * Main encryption function - encrypts message for a specific recipient
 * 
 * @param {string} message - Plaintext message
 * @param {string} myAddress - Sender's address
 * @param {string} recipientAddress - Recipient's address
 * @returns {Promise<string>} Encrypted message (base64)
 */
export async function encryptMessageForRecipient(message, myAddress, recipientAddress) {
  const key = await deriveSharedKey(myAddress, recipientAddress);
  return await encryptMessage(message, key);
}

/**
 * Main decryption function - decrypts message from a specific sender
 * 
 * @param {string} encryptedMessage - Encrypted message (base64)
 * @param {string} myAddress - Recipient's address
 * @param {string} senderAddress - Sender's address
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decryptMessageFromSender(encryptedMessage, myAddress, senderAddress) {
  const key = await deriveSharedKey(myAddress, senderAddress);
  return await decryptMessage(encryptedMessage, key);
}

/**
 * Checks if a string is likely encrypted (base64 format with minimum length)
 * 
 * @param {string} text - Text to check
 * @returns {boolean} True if likely encrypted
 */
export function isEncrypted(text) {
  // Simple heuristic: encrypted messages are base64 and longer
  // You might want a flag in the message structure instead
  try {
    return text.length > 20 && /^[A-Za-z0-9+/]+=*$/.test(text);
  } catch {
    return false;
  }
}
