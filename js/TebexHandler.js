const STORE_PUBLIC_KEY = "14x65-0efc322f98ad8bb72df89be7e4286e76cdafa449";

async function fetchStorePackages()
{
    try {
        const response = await fetch(`https://headless.tebex.io/api/accounts/${STORE_PUBLIC_KEY}/packages`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok)
        {
            throw new Error(`Failed to fetch packages: ${response.statusText}`);
        }

        const result = await response.json();
        console.log("--- YOUR TEBEX PACKAGES ---");

        result.data.forEach(pkg => {
            console.log(`Name: "${pkg.name}" | ID: ${pkg.id} | Type: ${pkg.type}`);
        });
    }
    catch (err) {
        console.error("Error fetching packages:", err);
    }
}

async function getBasketDetails() {
    const basketIdent = localStorage.getItem("sakuravoid_tebex_basket_ident");
    if (!basketIdent) {
        console.warn("getBasketDetails: No basket ident found in localStorage yet.");
        return null;
    }

    try {
        const response = await fetch(`https://headless.tebex.io/api/accounts/${STORE_PUBLIC_KEY}/baskets/${basketIdent}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            console.warn(`getBasketDetails: Failed with status ${response.status}`);
            if (response.status === 404) {
                localStorage.removeItem("sakuravoid_tebex_basket_ident");
            }
            return null;
        }

        const result = await response.json();
        return result.data;
    } catch (err) {
        console.error("Error fetching basket details:", err);
        return null;
    }
}

async function getOrCreateBasket()
{
    let basketIdent = localStorage.getItem("sakuravoid_tebex_basket_ident");
    let minecraftUsername = localStorage.getItem("sakuravoid_username");

    if (!basketIdent)
    {
        const response = await fetch(`https://headless.tebex.io/api/accounts/${STORE_PUBLIC_KEY}/baskets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currency: "USD", username: minecraftUsername })
        });

        const result = await response.json();

        basketIdent = result.data.ident;
        localStorage.setItem("sakuravoid_tebex_basket_ident", basketIdent);
    }

    return basketIdent;
}

async function authorizeTebexBasket(basketIdent)
{
    const currentUrl = window.location.href;
    const response = await fetch(`https://headless.tebex.io/api/accounts/${STORE_PUBLIC_KEY}/baskets/${basketIdent}/auth?returnUrl=${encodeURIComponent(currentUrl)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
    });

    if (!response.ok)
    {
        const errorData = await response.json().catch(() => null);
        console.error("Tebex Basket Auth Error:", errorData);
        throw new Error("Failed to initialize Tebex basket authorization.");
    }

    return await response.json();
}

async function initializeTebexStoreSession()
{
    try {
        const basketIdent = await getOrCreateBasket();
        await authorizeTebexBasket(basketIdent);

        return { success: true };
    }
    catch (err) {
        console.error("Store session initialization error:", err);

        return { success: false, message: err.message };
    }
}

async function addPackageToBasket(packageId)
{
    try {
        const basketIdent = await getOrCreateBasket();

        const response = await fetch(`https://headless.tebex.io/api/baskets/${basketIdent}/packages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                package_id: Number(packageId),
                quantity: 1
            })
        });

        if (!response.ok)
        {
            const errorDetails = await response.json();
            console.error("TEBEX 422 VALIDATION DETAIL:", JSON.stringify(errorDetails, null, 2));
            throw new Error("Failed to add package to basket.");
        }

        alert("Package successfully added to your cart!");
    }
    catch (err) {
        console.error(err);
        alert("Could not add package. Check your F12 Browser Console.");
    }
}

async function launchCheckout() {
    const basketIdent = localStorage.getItem("sakuravoid_tebex_basket_ident");
    const username = localStorage.getItem("sakuravoid_username");

    if (!basketIdent)
    {
        alert("Your basket is empty!");
        return;
    }

    Tebex.checkout.init({
        ident: basketIdent,
        username: username || "",
        theme: "dark",
        colors: [
            { name: "primary", color: "#ffb8e6" },
            { name: "secondary", color: "#232127" }
        ]
    });

    Tebex.checkout.launch();
}