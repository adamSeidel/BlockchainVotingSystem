import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useContract } from "../context/ContractProvider";

const DisplayConstituencies = () => {
    const { token, constituencies } = useContract();
    const [candidatesByConstituency, setCandidatesByConstituency] = useState({});

    useEffect(() => {
        const fetchCandidates = async () => {
            const candidatesData = {};
            for (const constituency of constituencies) {
                const candidates = await token.getCandidatesByConstituency(constituency);
                candidatesData[ethers.decodeBytes32String(constituency)] = candidates;
            }
            setCandidatesByConstituency(candidatesData);
        };

        if (token && constituencies.length > 0) {
            fetchCandidates();
        }
    }, [token, constituencies]);

    return (
        <>
            <h1>Election Constituencies</h1>
            {constituencies.map((constituency, index) => {
                const constituencyName = ethers.decodeBytes32String(constituency);
                const candidates = candidatesByConstituency[constituencyName] || [];
                return (
                    <div key={index} style={{ padding: '1rem 0' }}>
                        <hr />
                        {constituencyName}
                        {candidates.map((candidate, candidateIndex) => {
                            const candidateName = ethers.decodeBytes32String(candidate.name);
                            return (
                                <div key={candidateIndex} style={{ padding: '1rem 0' }}>
                                    <hr />
                                    🗳 {candidateName}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </>
    );
};

export default DisplayConstituencies;