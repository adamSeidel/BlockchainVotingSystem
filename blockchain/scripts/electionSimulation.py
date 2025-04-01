from web3 import Web3
import json

# Connect to Hardhat node
w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))

# Check connection
assert w3.is_connected(), "Hardhat node connection failed"

# Set default account (first account from Hardhat accounts)
w3.eth.default_account = w3.eth.accounts[0]

# Load ABI
with open("../artifacts/contracts/FPTP.sol/FPTP.json") as f:
    contract_json = json.load(f)
    abi = contract_json['abi']

