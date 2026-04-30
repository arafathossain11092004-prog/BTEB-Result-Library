const fetchTest = async () => {
    try {
        const u = `https://btebresultszone.com/institute-results`;
        const r = await fetch(u);
        const t = await r.text();
        console.log(t.substring(0, 1500));
        
        // Let's see if we can find any API in there by looking at the page source
        const parts = t.split("institute");
        console.log("split parts:", parts.length);
    } catch(e) {
        console.log("ERR", e);
    }
};
fetchTest();
