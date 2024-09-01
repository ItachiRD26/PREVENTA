// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-analytics.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAeO-L_ZH4QBsOasaKL0clP21mUcMQy3Jk",
    authDomain: "preventaduff.firebaseapp.com",
    projectId: "preventaduff",
    storageBucket: "preventaduff.appspot.com",
    messagingSenderId: "730769540302",
    appId: "1:730769540302:web:0251b7353ef953938afc9f",
    measurementId: "G-YFLCLLZ24J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app); // Initialize Firestore

let web3;
let account;
let ethPriceUSD = 0;
const tokenPriceUSD = 0.00001;
const totalTokens = 10000000000; // Total de tokens disponibles
let tokensSold = 0; // Tokens vendidos
let totalRaised = 0; // Total recaudado en USD
const arbitrumRpcUrl = "https://arbitrum-mainnet.infura.io/v3/f515a55331b94cd693d03a4f0a8a39ad";
const destinationWallet = "0x6084d9a2ff9c7059d555e7437b82eaf166af34d7";

async function connectWallet() {
    if (window.ethereum) {
        try {
            web3 = new Web3(window.ethereum);

            // Cambiar la red si es necesario
            const chainId = await web3.eth.getChainId();
            if (chainId !== 42161) { // 42161 es Arbitrum One
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0xA4B1' }] // 42161 en hexadecimal
                });
            }

            // Solicitar la conexión de la cuenta
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const accounts = await web3.eth.getAccounts();
            account = accounts[0];

            // Actualizar la UI
            document.getElementById('connect-wallet-btn').style.display = 'none';
            document.getElementById('disconnect-wallet-btn').style.display = 'block';
            alert(`Wallet connected: ${account}`);
        } catch (error) {
            console.error("User denied account access or failed to switch network", error);
            alert("Failed to connect wallet. Please ensure MetaMask is installed and try again.");
        }
    } else {
        alert("Please install MetaMask!");
    }
}

function disconnectWallet() {
    account = null;
    document.getElementById('connect-wallet-btn').style.display = 'block';
    document.getElementById('disconnect-wallet-btn').style.display = 'none';
    alert("Wallet disconnected");
}

async function getETHPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        ethPriceUSD = data.ethereum.usd;
        document.getElementById('eth-price').textContent = ethPriceUSD.toFixed(2);
    } catch (error) {
        console.error("Error fetching ETH price:", error);
    }
}

function updateDUFFAmount() {
    const ethAmount = parseFloat(document.getElementById('eth-amount').value);
    if (ethAmount) {
        const duffAmount = (ethAmount * ethPriceUSD) / tokenPriceUSD;
        document.getElementById('duff-amount').value = duffAmount.toFixed(0);
    } else {
        document.getElementById('duff-amount').value = 0;
    }
}

function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    const progress = (tokensSold / totalTokens) * 100;
    progressBar.style.width = `${progress}%`;
}

async function buyTokens() {
    const ethAmount = parseFloat(document.getElementById('eth-amount').value);
    const duffAmount = parseFloat(document.getElementById('duff-amount').value);

    if (ethAmount >= 0.004 && ethAmount <= 10 && account) {
        try {
            const transaction = {
                from: account,
                to: destinationWallet,
                value: web3.utils.toWei(ethAmount.toString(), 'ether'),
            };

            // Usa el objeto web3 para enviar la transacción
            await web3.eth.sendTransaction(transaction);

            const amountRaised = ethAmount * ethPriceUSD;
            totalRaised += amountRaised;
            tokensSold += duffAmount;
            document.getElementById('remaining-tokens').textContent = (totalTokens - tokensSold).toLocaleString();
            document.getElementById('raised-amount').textContent = totalRaised.toFixed(2);

            updateProgressBar();

            // Guardar la transacción en la base de datos
            await saveTransaction(account, ethAmount, duffAmount, amountRaised);

            alert(`Successfully purchased ${duffAmount} DUFF tokens!`);
        } catch (error) {
            console.error("Purchase failed:", error);
            alert("Purchase failed. Please try again.");
        }
    } else {
        alert('Please enter a valid ETH amount between 0.004 and 10, and ensure your wallet is connected.');
    }
}

async function saveTransaction(walletAddress, ethAmount, duffAmount, amountRaised) {
    try {
        const docRef = await addDoc(collection(db, "transactions"), {
            walletAddress: walletAddress,
            ethAmount: ethAmount,
            duffAmount: duffAmount,
            amountRaised: amountRaised,
            date: new Date().toISOString()
        });
        console.log("Transaction successfully written with ID: ", docRef.id);
    } catch (error) {
        console.error("Error writing transaction: ", error);
    }
}

// Eventos de los botones
document.getElementById('connect-wallet-btn').addEventListener('click', connectWallet);
document.getElementById('disconnect-wallet-btn').addEventListener('click', disconnectWallet);
document.getElementById('eth-amount').addEventListener('input', updateDUFFAmount);
document.getElementById('buy-duff-btn').addEventListener('click', buyTokens);
document.getElementById('white-paper-btn').addEventListener('click', function() {
    window.open('https://duff.gitbook.io/duff-whitepaper', '_blank');
});

// Inicializa la aplicación
getETHPrice();
setInterval(getETHPrice, 60000); // Actualiza el precio de ETH cada minuto
updateProgressBar();
