let web3;
let account;
let ethPriceUSD = 0;
const tokenPriceUSD = 0.00001;
const totalTokens = 10000000000; // Total de tokens disponibles
let tokensSold = 0; // Tokens vendidos
const arbitrumRpcUrl = "https://arbitrum-mainnet.infura.io/v3/f515a55331b94cd693d03a4f0a8a39ad";
const destinationWallet = "0x6084d9a2ff9c7059d555e7437b82eaf166af34d7";

async function connectWallet() {
    if (window.ethereum) {
        try {
            web3 = new Web3(window.ethereum);
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '42161' }] // 0xA4B1 es el Chain ID para Arbitrum One
            });
            await window.ethereum.enable();
            const accounts = await web3.eth.getAccounts();
            account = accounts[0];
            document.getElementById('connect-wallet-btn').style.display = 'none';
            document.getElementById('disconnect-wallet-btn').style.display = 'block';
            alert(`Wallet connected: ${account}`);
        } catch (error) {
            console.error("User denied account access or failed to switch network", error);
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
            const web3Arbitrum = new Web3(arbitrumRpcUrl);
            const transaction = {
                from: account,
                to: destinationWallet,
                value: web3Arbitrum.utils.toWei(ethAmount.toString(), 'ether'),
            };

            await web3Arbitrum.eth.sendTransaction(transaction);

            tokensSold += duffAmount;
            document.getElementById('remaining-tokens').textContent = (totalTokens - tokensSold).toLocaleString();
            updateProgressBar();

            // Guardar la transacción en la base de datos
            saveTransaction(account, ethAmount, duffAmount);

            alert(`Successfully purchased ${duffAmount} DUFF tokens!`);
        } catch (error) {
            console.error("Purchase failed:", error);
            alert("Purchase failed. Please try again.");
        }
    } else {
        alert('Please enter a valid ETH amount between 0.004 and 10, and ensure your wallet is connected.');
    }
}

function saveTransaction(walletAddress, ethAmount, duffAmount) {
    const transactionData = {
        walletAddress: walletAddress,
        ethAmount: ethAmount,
        duffAmount: duffAmount,
        date: new Date().toISOString()
    };

    // Aquí podrías enviar esta información a una base de datos, usando una API REST o GraphQL
    console.log('Transaction saved:', transactionData);
}

document.getElementById('connect-wallet-btn').addEventListener('click', connectWallet);
document.getElementById('disconnect-wallet-btn').addEventListener('click', disconnectWallet);
document.getElementById('eth-amount').addEventListener('input', updateDUFFAmount);
document.getElementById('buy-duff-btn').addEventListener('click', buyTokens);

// Inicializa la aplicación
getETHPrice();
setInterval(getETHPrice, 60000); // Actualiza el precio de ETH cada minuto
updateProgressBar();
