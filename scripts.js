let web3;
let account;
let ethPriceUSD = 0;
const tokenPriceUSD = 0.00034; // Precio del token en USD
const totalTokens = 5000000000000; // Total de tokens disponibles
let tokensSold = 0; // Tokens vendidos
let totalRaised = 0; // Total recaudado en USD
const goal = 500000; // Objetivo en USD
const arbitrumRpcUrl = "https://arbitrum-mainnet.infura.io/v3/f515a55331b94cd693d03a4f0a8a39ad";
const destinationWallet = "0x6084d9a2ff9c7059d555e7437b82eaf166af34d7";
const arbitrumChainId = '0xA4B1'; // 42161 en hexadecimal para Arbitrum One

async function connectWallet() {
    if (window.ethereum) {
        try {
            web3 = new Web3(window.ethereum);
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            account = accounts[0];
            
            let chainId = await web3.eth.getChainId();
            console.log('Current Chain ID:', chainId);

            if (chainId !== parseInt(arbitrumChainId, 16)) {
                await switchNetwork();
                chainId = await web3.eth.getChainId(); // Actualiza el chainId después de intentar cambiar de red
                console.log('Switched Chain ID:', chainId);
            }

            // Verifica la red después de intentar cambiarla
            const networkName = chainId === parseInt(arbitrumChainId, 16) ? 'Wrong Network' : 'Arbitrum One';

            document.getElementById('connect-wallet-btn').style.display = 'none';
            document.getElementById('disconnect-wallet-btn').style.display = 'block';
            document.getElementById('address-display').textContent = `${account.slice(0, 6)}...${account.slice(-4)}`;
            document.getElementById('network-display').textContent = networkName;
            alert(`Wallet connected: ${account} on ${networkName}`);
        } catch (error) {
            console.error("Error connecting wallet:", error);
            alert("Failed to connect wallet. Please ensure MetaMask is installed and try again.");
        }
    } else {
        alert("Please install MetaMask!");
    }
}


async function switchNetwork() {
    try {
        const chainId = await web3.eth.getChainId();
        console.log('Switching Network. Current Chain ID:', chainId);
        
        if (chainId !== parseInt(arbitrumChainId, 16)) {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: arbitrumChainId }],
            });
        }
    } catch (error) {
        if (error.code === 4902) { // Network not added yet
            try {
                console.log('Adding Arbitrum One Network');
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: arbitrumChainId,
                        chainName: 'Arbitrum One',
                        rpcUrls: [arbitrumRpcUrl],
                        nativeCurrency: {
                            name: 'ETH',
                            symbol: 'ETH',
                            decimals: 18
                        },
                        blockExplorerUrls: ['https://arbiscan.io']
                    }]
                });
            } catch (addError) {
                console.error("Error adding network:", addError);
                alert("Failed to add the network. Please add it manually.");
            }
        } else {
            console.error("Error switching network:", error);
            alert("Failed to switch network. Please switch manually.");
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
        document.getElementById('eth-value-usd').textContent = `$${(ethAmount * ethPriceUSD).toFixed(2)} USD`;
    } else {
        document.getElementById('duff-amount').value = 0;
        document.getElementById('eth-value-usd').textContent = `$0.00 USD`;
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
    const ethAmountInput = document.getElementById('eth-amount'); // Captura el input por su ID
    const ethAmount = ethAmountInput.value; // Usamos el valor como string, sin convertir a número flotante

    // Logs para depuración del valor capturado
    console.log(`Valor ingresado en el input (ETH): ${ethAmount}`);

    // Validación del valor ingresado
    if (isNaN(parseFloat(ethAmount))) {
        console.log("El valor ingresado no es un número válido.");
        alert('Por favor, ingresa un número válido.');
        return;
    }

    const ethAmountFloat = parseFloat(ethAmount); // Convertimos a flotante para validaciones adicionales

    if (ethAmountFloat < 0.004 || ethAmountFloat > 0.54) {
        console.log("El monto de ETH está fuera del rango permitido.");
        alert('Por favor, ingresa una cantidad de ETH entre 0.004 y 0.54.');
        return;
    }

    if (!account) {
        console.log("La billetera no está conectada.");
        alert('Por favor, conecta tu billetera.');
        return;
    }

    try {
        // Convertir el monto de ETH a Wei usando el valor como string
        const weiAmount = web3.utils.toWei(ethAmount, 'ether');

        // Log para depuración de la conversión
        console.log(`ETH Amount: ${ethAmount}, Wei Amount (después de conversión): ${weiAmount}`);

        // Crear la transacción
        const tx = {
            from: account,
            to: destinationWallet,
            value: weiAmount, 
            gas: '300000',
            gasPrice: web3.utils.toWei('0.001', 'gwei'), // Ajuste del gasPrice
        };

        // Enviar la transacción
        const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [tx],
        });

        let txReceipt = null;
        while (txReceipt === null) {
            txReceipt = await web3.eth.getTransactionReceipt(txHash);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo antes de intentar de nuevo
        }

        // Verificación del estado de la transacción
        if (txReceipt.status) {
            totalRaised += ethAmountFloat * ethPriceUSD; // Actualizar el total recaudado en USD
            tokensSold += duffAmount;
            updateProgressBar();
            alert(`¡Has comprado exitosamente ${duffAmount} tokens DUFF!`);
        } else {
            alert('La transacción ha fallado.');
        }
    } catch (error) {
        console.error("Error en la solicitud de transacción:", error);
        alert("Error en la transacción. Por favor, intenta nuevamente.");
    }
}




function updateDUFFAmount() {
    const ethAmount = parseFloat(document.getElementById('eth-amount').value);
    if (!isNaN(ethAmount) && ethAmount > 0) {
        const duffAmount = (ethAmount * ethPriceUSD) / tokenPriceUSD;
        document.getElementById('duff-amount').value = duffAmount.toFixed(0);
        document.getElementById('eth-value-usd').textContent = `$${(ethAmount * ethPriceUSD).toFixed(2)} USD`;
    } else {
        document.getElementById('duff-amount').value = 0;
        document.getElementById('eth-value-usd').textContent = `$0.00 USD`;
    }
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
