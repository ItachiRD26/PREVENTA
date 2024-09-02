let web3;
let account;
let ethPriceUSD = 0;
const tokenPriceUSD = 0.00001; // Precio del token en USD
const totalTokens = 5000000000000; // Total de tokens disponibles
let tokensSold = 0; // Tokens vendidos
let totalRaised = 0; // Total recaudado en USD
const goal = 50000; // Objetivo en USD
const arbitrumRpcUrl = "https://arbitrum-mainnet.infura.io/v3/f515a55331b94cd693d03a4f0a8a39ad";
const destinationWallet = "0x6084d9a2ff9c7059d555e7437b82eaf166af34d7";
const binanceChainId = '0x38'; // 56 en hexadecimal para Binance Smart Chain
const arbitrumChainId = '0xA4B1'; // 42161 en hexadecimal para Arbitrum One

async function connectWallet() {
    if (window.ethereum) {
        try {
            web3 = new Web3(window.ethereum);
            
            // Solicitar la conexión de la cuenta
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            account = accounts[0];

            // Obtener el ID de la cadena
            const chainId = await web3.eth.getChainId();
            let networkName;
            if (chainId === 42161) {
                networkName = 'Arbitrum One';
            } else if (chainId === 56) {
                networkName = 'Binance Smart Chain';
            } else {
                networkName = 'Unknown Network';
                // Solicitar al usuario que cambie de red si no está en la red correcta
                await switchNetwork();
            }

            // Actualizar la UI
            document.getElementById('connect-wallet-btn').style.display = 'none';
            document.getElementById('disconnect-wallet-btn').style.display = 'block';
            document.getElementById('address-display').textContent = `${account.slice(0, 6)}...${account.slice(-4)}`;
            document.getElementById('network-display').textContent = networkName;
            alert(`Wallet connected: ${account}`);
        } catch (error) {
            console.error("Error connecting wallet:", error);
            alert("Failed to connect wallet. Please ensure MetaMask is installed and try again.");
        }
    } else {
        alert("Please install MetaMask!");
    }
}

async function switchNetwork() {
    const chainId = await web3.eth.getChainId();
    if (chainId !== 42161 && chainId !== 56) {
        try {
            // Solicitar al usuario que agregue y cambie a la red de Arbitrum One
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: arbitrumChainId,
                    chainName: 'Arbitrum One',
                    rpcUrls: ['https://arbitrum-mainnet.infura.io/v3/f515a55331b94cd693d03a4f0a8a39ad'],
                    nativeCurrency: {
                        name: 'ETH',
                        symbol: 'ETH',
                        decimals: 18
                    },
                    blockExplorerUrls: ['https://arbiscan.io']
                }]
            });
        } catch (error) {
            console.error("Error adding or switching network:", error);
            alert("Failed to switch or add network. Please switch manually.");
        }
    }
}

function disconnectWallet() {
    account = null;
    document.getElementById('connect-wallet-btn').style.display = 'block';
    document.getElementById('disconnect-wallet-btn').style.display = 'none';
    document.getElementById('address-display').textContent = '';
    document.getElementById('network-display').textContent = '';
    alert("Wallet disconnected");
}

async function getETHPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        ethPriceUSD = data.ethereum.usd;
        document.getElementById('eth-price').textContent = `$${ethPriceUSD.toFixed(2)}`;
    } catch (error) {
        console.error("Error fetching ETH price:", error);
        document.getElementById('eth-price').textContent = "Error";
    }
}

function updateDUFFAmount() {
    const ethAmount = parseFloat(document.getElementById('eth-amount').value);
    if (!isNaN(ethAmount) && ethAmount > 0) {
        const duffAmount = (ethAmount * ethPriceUSD) / tokenPriceUSD;
        document.getElementById('duff-amount').value = duffAmount.toFixed(0);
    } else {
        document.getElementById('duff-amount').value = 0;
    }
}

function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    const raisedAmountElement = document.getElementById('raised-amount');
    const remainingTokensElement = document.getElementById('remaining-tokens');
    const progress = (totalRaised / goal) * 100; // Porcentaje del objetivo alcanzado
    progressBar.style.width = `${progress}%`;

    // Actualizar el texto de la barra de progreso
    progressBar.textContent = `${progress.toFixed(2)}%`;

    // Mostrar el total recaudado y los tokens restantes
    raisedAmountElement.textContent = `$${totalRaised.toFixed(2)}`;
    remainingTokensElement.textContent = (totalTokens - tokensSold).toLocaleString();
}

async function buyTokens() {
    const ethAmount = parseFloat(document.getElementById('eth-amount').value);
    const duffAmount = parseFloat(document.getElementById('duff-amount').value);

    if (!isNaN(ethAmount) && ethAmount >= 0.004 && ethAmount <= 10 && account) {
        try {
            const transaction = {
                from: account,
                to: destinationWallet,
                value: web3.utils.toWei(ethAmount.toString(), 'ether'),
                gas: 21000, // Gas estimado para la transacción
                gasPrice: web3.utils.toWei('5', 'gwei') // Precio del gas
            };

            // Enviar la transacción y esperar confirmación
            const txHash = await web3.eth.sendTransaction(transaction);

            // Confirmar la transacción
            const receipt = await web3.eth.getTransactionReceipt(txHash.transactionHash);

            if (receipt.status) {
                const amountRaised = ethAmount * ethPriceUSD;
                totalRaised += amountRaised;
                tokensSold += duffAmount;

                updateProgressBar();
                alert(`Successfully purchased ${duffAmount} DUFF tokens!`);
            } else {
                alert("Transaction failed. Please try again.");
            }
        } catch (error) {
            console.error("Purchase failed:", error);
            if (error.message.includes('insufficient funds')) {
                alert("Insufficient funds. Please check your balance and try again.");
            } else {
                alert("Transaction failed. Please try again.");
            }
        }
    } else {
        alert('Please enter a valid ETH amount between 0.00001 and 10, and ensure your wallet is connected.');
    }
}

// Eventos de los botones
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('connect-wallet-btn').addEventListener('click', connectWallet);
    document.getElementById('disconnect-wallet-btn').addEventListener('click', disconnectWallet);
    document.getElementById('eth-amount').addEventListener('input', updateDUFFAmount);
    document.getElementById('buy-duff-btn').addEventListener('click', buyTokens);
    document.getElementById('white-paper-btn').addEventListener('click', function() {
        window.open('https://duff.gitbook.io/duff-whitepaper', '_blank');
    });
});

// Inicializa la aplicación
getETHPrice();
setInterval(getETHPrice, 60000); // Actualiza el precio de ETH cada minuto
updateProgressBar();
