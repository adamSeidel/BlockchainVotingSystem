import React, { createContext, useContext, useEffect, useState } from "react";
import { ethers } from "ethers";

import TokenArtifact from "../contracts/Election.json";
import contractAddress from "../contracts/contract-address.json";

const ContractContext = createContext();

export const useContract = () => useContext(ContractContext);

export const ContractProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [electionAdmin, setElectionAdmin] = useState("");
  const [electionCandidates, setElectionCandidates] = useState([]);

  useEffect(() => {
    const init = async () => {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(
            contractAddress.Election,
            TokenArtifact.abi,
            signer
        );
        setToken(contract);

        // Fetch the election admin address
        const electionAdminAddress = await contract.admin()
        setElectionAdmin(electionAdminAddress);

        // Fetch the election candidates
        const electionCandidates = await contract.getElectionCandidates()
        setElectionCandidates(electionCandidates);
    };
    init();
  }, []);

  return (
    <ContractContext.Provider value={{ token, electionAdmin, electionCandidates }}>
      {children}
    </ContractContext.Provider>
  );
};