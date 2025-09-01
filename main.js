import { MetaMaskSDK } from '@metamask/sdk';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { encodeURL, createQR } from '@solana/pay';
import BigNumber from 'bignumber.js';
import qrcode from 'qrcode';
import { resolve } from '@bonfida/spl-name-service';

// The SDK will automatically use deep linking to connect to the MetaMask Mobile app.
const MMSDK = new MetaMaskSDK({
    dappMetadata: {
        name: "My Solana Pay dApp",
        url: window.location.host,
    },
});

let metamaskAccount;

// Wait for the DOM to be fully loaded
window.addEventListener('DOMContentLoaded', async () => {
    // Get HTML elements by their IDs and classes
    const connectButton = document.getElementById('connect-button');
    const statusMessage = document.getElementById('status-message');
    const paymentForm = document.querySelector('.payment-form');
    const paymentInfo = document.querySelector('.payment-info');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const recipientDomainInput = document.getElementById('recipient-domain');
    const amountInput = document.getElementById('amount');
    const payForm = document.getElementById('pay-form');

    // Handle the button click to connect to MetaMask
    connectButton.addEventListener('click', async () => {
        try {
            statusMessage.textContent = 'Connecting to MetaMask...';
            const accounts = await MMSDK.connect();
            metamaskAccount = accounts[0];
            statusMessage.textContent = `Connected! Address: ${metamaskAccount.slice(0, 6)}...${metamaskAccount.slice(-4)}`;
            
            // Show the payment form after a successful connection
            connectButton.classList.add('hidden');
            paymentForm.classList.remove('hidden');
        } catch (e) {
            console.error(e);
            statusMessage.textContent = 'Connection failed. Please check the console for details.';
        }
    });

    // Handle form submission to generate the payment QR code
    payForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent the form from refreshing the page

        if (!metamaskAccount) {
            statusMessage.textContent = 'Please connect your MetaMask wallet first.';
            return;
        }

        try {
            const domainOrAddress = recipientDomainInput.value;
            const amount = new BigNumber(amountInput.value);

            let recipientPublicKey;
            const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

            // Check if the input is a .sol domain
            if (domainOrAddress.endsWith('.sol')) {
                statusMessage.textContent = `Resolving ${domainOrAddress}...`;
                try {
                    recipientPublicKey = await resolve(connection, domainOrAddress);
                    if (!recipientPublicKey) {
                        statusMessage.textContent = `Could not resolve ${domainOrAddress}.`;
                        return;
                    }
                } catch (e) {
                    statusMessage.textContent = `Error resolving domain: ${e.message}`;
                    console.error(e);
                    return;
                }
            } else {
                // If not a domain, assume it's a public key
                try {
                    recipientPublicKey = new PublicKey(domainOrAddress);
                } catch (e) {
                    statusMessage.textContent = 'Invalid Solana address.';
                    return;
                }
            }
            
            // Create a unique reference for the transaction
            const reference = new PublicKey(metamaskAccount); 

            // Create a Solana Pay URL
            const url = encodeURL({
                recipient: recipientPublicKey,
                amount,
                reference,
                label: 'MetaMask Hackathon',
                message: 'Payment from MetaMask Embedded Wallet',
            });

            // Generate and display the QR code
            statusMessage.textContent = 'Scan the QR code to pay.';
            qrcodeContainer.innerHTML = ''; 
            
            const qrCodeSvg = await qrcode.toString(url.toString(), { type: 'svg' });
            qrcodeContainer.innerHTML = qrCodeSvg;
            
            // Show the QR code section and hide the form
            paymentInfo.classList.remove('hidden');
            paymentForm.classList.add('hidden');

        } catch (e) {
            console.error(e);
            statusMessage.textContent = `Error: ${e.message}`;
        }
    });
});
