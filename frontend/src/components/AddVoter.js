import React, { useState } from "react";
import { ethers } from "ethers";
import { useContract } from "../context/ContractProvider";

const addNewVoter = async (token, selectedConstituency) => {
    var newVoterAddress = document.getElementById("newVoterAddress").value;

    try {
        await token.giveRightToVote(newVoterAddress, selectedConstituency);

        const successMessage = "Voter " + newVoterAddress + " has been added successfully and is now eligible to vote";
        console.log(successMessage)
        document.getElementById("addVoterMessage").innerHTML = successMessage;

    } catch (error) {
        var errorMessage = error.reason;

        document.getElementById("addVoterMessage").innerHTML = "Error: " + errorMessage;
    }
};

const AddVoter = () => {
    const { token, electionAdmin, constituencies } = useContract();
    const [selectedConstituency, setSelectedConstituency] = useState("");


    return (
        <>
            <h1>Add Voter</h1>
            <div style={{ borderStyle: "solid"}}>
            <h3 style={{ fontWeight: "normal"}}>Only the <strong style={{ color: "red" }}>Election Admin</strong> with a blockchain address of <strong style={{ color: "red" }}>{electionAdmin}</strong> can add new voters</h3>
            </div>
            <div style={{ borderStyle: "solid", padding: '1rem 0', marginTop: "-1.5px"}}>
                        <input style={{ width: "400px" }} id="newVoterAddress" placeholder={"Enter New Voters Public Address Here"}></input>
                        <br></br>

                        <label htmlFor="constituencySelect">Select Your Constituency:</label>
                        <select id="constituencySelect" value={selectedConstituency} onChange={(e) => setSelectedConstituency(e.target.value)}>
                        <option value="" disabled>Select a constituency</option>
                            {constituencies.map((constituency, index) => (
                                <option key={index} value={constituency}>
                                    {ethers.decodeBytes32String(constituency)}
                                </option>
                            ))}
                        </select>

                        <br></br>
                        <button onClick={() => addNewVoter(token, selectedConstituency)}>Add New Voter</button>
               
                <h3 id="addVoterMessage"> </h3>
                </div>
        </>
    );
};

export default AddVoter;