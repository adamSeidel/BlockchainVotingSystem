const AddVoter = () => {
    return (
        <>
            <h1>Add Voter</h1>
            <div style={{ borderStyle: "solid"}}>
            <h3 style={{ fontWeight: "normal"}}>Only the <strong style={{ color: "red" }}>UK Electoral Commission</strong> with a blockchain address of <strong style={{ color: "red" }}>XXX</strong> can add new voters</h3>
            </div>
            <div style={{ borderStyle: "solid", padding: '1rem 0', marginTop: "-1.5px"}}>
                        <input style={{ width: "400px" }} id="newVoterAddress" placeholder={"Enter New Voters Public Address Here"}></input>
                        {/* <button onClick={addNewVoter}>Add New Voter</button> */}
                        <button>Add New Voter</button>
                <h3 id="addVoterMessage"> </h3>
                </div>
        </>
    );
};

export default AddVoter;