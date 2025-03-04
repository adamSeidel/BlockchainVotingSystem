import { useEffect } from "react";
import { useContract } from "../context/ContractProvider";

const DisplayElectoralRegister = () => {
    const { eligibleVoters, voterConstituencies } = useContract();

    useEffect(() => {
        console.log("Debug");
        console.log("Eligible Voters:", eligibleVoters);
        console.log("Voter Constituencies:", voterConstituencies);

        
    }, [eligibleVoters, voterConstituencies]);


    return (
        <>
            <h1>Display Electoral Register</h1>
            <div style={{ borderStyle: "solid"}}>
            <h3 style={{ fontWeight: "normal"}}>Only addresses listed below are <strong style={{ color: "red" }}>elgible</strong> to vote in this election</h3>
            </div>
            {eligibleVoters.map((address, index) => {
            return (
                <div style={{ padding: '1rem 0'}}>
                <hr></hr>
                🏠 {address} - 🗺 Constituency:
                </div>
            );
            })}
        </>
    );
};

export default DisplayElectoralRegister;