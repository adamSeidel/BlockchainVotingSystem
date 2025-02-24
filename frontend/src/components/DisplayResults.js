const DisplayResults = () => {
    return (
        <>
            <h1>Display Election Results</h1>
            <div style={{ borderStyle: "solid", padding: '1rem 0', marginTop: "-1.5px"}}>
            {/* <button onClick={displayWinner}>Display Election Winner</button> */}
            <button>Display Election Winner</button>
            <h3 id="winner"> </h3>
            </div>
        </>
    );
};

export default DisplayResults;