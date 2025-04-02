from web3 import Web3
import json
import pandas as pd
import random
import time

# Encode and Decode String to Bytes 32 and visa versa
def str_to_bytes32(text):
    return text.encode('utf-8').ljust(32, b'\0')[:32]

def decode_bytes32(b):
    return b.decode('utf-8').rstrip('\x00')

# Read the Uk 2024 General Election data into a pandas df
general_election_data = pd.read_csv('../test/UK-2024-Election-Results.csv')
general_election_data = general_election_data[["Constituency name", 
                                               "Con",
                                               "Lab",
                                               "LD",
                                               "RUK",
                                               "Green",
                                               "SNP",
                                               "PC",
                                               "DUP",
                                               "SF",
                                               "SDLP",
                                               "UUP",
                                               "APNI",
                                               ]]

# Names of candidates in each constituency
candidates = general_election_data.columns.values[1:]
candidates_bytes32 = [str_to_bytes32(candidate) for candidate in candidates]

# Constituencies of the general election
general_election_constituencies = general_election_data["Constituency name"].values.tolist()

# Connect to Hardhat node
w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))

# Check connection
assert w3.is_connected(), "Hardhat node connection failed"

# Set default account (first account from Hardhat accounts)
admin = w3.eth.accounts[0]

# Load ABI and Bytecode
with open("../artifacts/contracts/FPTP.sol/FPTP.json") as f:
    contract_json = json.load(f)
    abi = contract_json['abi']
    bytecode = contract_json['bytecode']

# Deploy the conract
FPTP = w3.eth.contract(abi=abi, bytecode=bytecode)
tx_hash = FPTP.constructor().transact({'from': admin})
tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
election_address = tx_receipt.contractAddress
print(f"Contract deployed at: {election_address}")

election = w3.eth.contract(address=election_address, abi=abi)

# Add election constituencies and candidates for each constituency
startTime = time.time()
print("Adding constituencies")
for constituency in general_election_data['Constituency name']:
    addCandidateTransaction = election.functions.addConstituency(str_to_bytes32(constituency), candidates_bytes32).transact({'from': admin})
    # Wait for transaction to complete
    w3.eth.wait_for_transaction_receipt(addCandidateTransaction)
else:
    print("Constituencies added")
endTime = time.time()
print(f"Total time to add constituencies {endTime-startTime}")

# Add voters
startTime = time.time()
votes = general_election_data[general_election_data["Constituency name"] == 'Aberafan Maesteg'].values[0].tolist()[1:]
accounts = []
accountsIndex = 0
for candidate_index, number_votes in enumerate(votes):
    for vote in range(number_votes):
        # Create a new account for voter
        private_key = "0x" + "".join(random.choices('0123456789abcdef', k=64))
        accounts.append(w3.eth.account.from_key(private_key))

        # Fund the new account
        fund_account_transaction = {
            'from': admin,
            'to': accounts[accountsIndex].address,
            'value': w3.to_wei(0.005, 'ether'),
        }
        fund_account_hash = w3.eth.send_transaction(fund_account_transaction)
        w3.eth.wait_for_transaction_receipt(fund_account_hash)

        # Give voter the right to vote
        giveRightToVoteTransaction = election.functions.giveRightToVote(accounts[accountsIndex].address, str_to_bytes32('Aberafan Maesteg')).transact({'from': admin})
        w3.eth.wait_for_transaction_receipt(giveRightToVoteTransaction)

        accountsIndex += 1

endTime = time.time()
print(f"Total time to add voters {endTime-startTime}")

# Simulate an Aberafan Maesteg Constituency Vote
# 21 mins
print(f"Simulating an Aberafan Maesteg Election")
startTime = time.time()
votes = general_election_data[general_election_data["Constituency name"] == 'Aberafan Maesteg'].values[0].tolist()[1:]

accountsIndex = 0

for candidate_index, number_votes in enumerate(votes):
    for vote in range(number_votes):
        # Place votes
        voteTransaction = election.functions.vote(candidate_index).build_transaction({
            'from': accounts[accountsIndex].address,
            'nonce': w3.eth.get_transaction_count(accounts[accountsIndex].address),
            'gas': 200000,
            'gasPrice': w3.to_wei('1', 'gwei')
        })
        voteTransactionSigned = w3.eth.account.sign_transaction(voteTransaction, private_key=accounts[accountsIndex]._private_key)

        voteTransactionHash = w3.eth.send_raw_transaction(voteTransactionSigned.raw_transaction)
        w3.eth.wait_for_transaction_receipt(voteTransactionHash)

        accountsIndex += 1

endTime = time.time()
print(f"Total time to place votes {endTime-startTime}")

constituencyCandidates = election.functions.getCandidatesByConstituency(str_to_bytes32('Aberafan Maesteg')).call()

for i, candidate in enumerate(constituencyCandidates):
    vote_count = candidate[1]
    expected_vote_count = votes[i]
    assert vote_count == expected_vote_count, f"Wrong votes for candidate {i}: expected {expected_vote_count}, got {vote_count}"