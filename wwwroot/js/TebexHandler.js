const STORE_PUBLIC_KEY = "14x65-0efc322f98ad8bb72df89be7e4286e76cdafa449";

async function fetchStorePackages() {
    try {
        const response = await fetch(`https://headless.tebex.io/api/accounts/${STORE_PUBLIC_KEY}/packages`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch packages: ${response.statusText}`);
        }

        const result = await response.json();
        console.log("--- YOUR TEBEX PACKAGES ---");
        result.data.forEach(pkg => {
            console.log(`Name: "${pkg.name}" | ID: ${pkg.id} | Type: ${pkg.type}`);
        });
    } catch (err) {
        console.error("Error fetching packages:", err);
    }
}

async function loginToBasket(username) {
    if (!username || username.trim() === "") {
        return { success: false, message: "Username cannot be empty." };
    }

    const cleanUsername = username.trim();
    const isValidFormat = /^[a-zA-Z0-9_]{3,16}$/.test(cleanUsername);
    if (!isValidFormat) {
        return { success: false, message: "Invalid Minecraft username format." };
    }

    try {
        // Step A: Attempt Mojang lookup with your reliable CORS fallback
        let verifiedUsername = cleanUsername;
        try {
            const mojangResponse = await fetch(`https://api.mojang.com/users/profiles/minecraft/${cleanUsername}`);
            if (mojangResponse.ok) {
                const mojangData = await mojangResponse.json();
                if (mojangData && mojangData.name) {
                    verifiedUsername = mojangData.name;
                }
            }
        } catch (corsErr) {
            console.warn("Mojang API lookup caught CORS/network block, using input name:", corsErr);
        }

        // Cache the valid username locally
        localStorage.setItem("sakuravoid_username", verifiedUsername);

        // Step B: Get or create the active basket
        const basketIdent = await getOrCreateBasket();
        const currentUrl = window.location.href;

        // Step C: Call official Tebex Headless API Basket Auth GET endpoint
        const authResponse = await fetch(`https://headless.tebex.io/api/accounts/${STORE_PUBLIC_KEY}/baskets/${basketIdent}/auth?returnUrl=${encodeURIComponent(currentUrl)}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!authResponse.ok) {
            const errorData = await authResponse.json().catch(() => null);
            console.error("Tebex Basket Auth Error:", errorData);
            return { success: false, message: "Failed to initialize Tebex basket authorization." };
        }

        const authResult = await authResponse.json();

        // Handle Tebex auth provider response data correctly
        if (authResult.data && authResult.data.length > 0) {
            // If your store requires redirecting through the auth URL provider:
            // window.location.href = authResult.data[0].url;
            return { success: true, message: "" };
        } else {
            return { success: true, message: "" };
        }

    } catch (err) {
        console.error("Login basket error:", err);
        return { success: false, message: "Network error initializing account login." };
    }
}

async function getOrCreateBasket() {
    let basketIdent = localStorage.getItem("sakuravoid_tebex_basket_ident");
    if (!basketIdent) {
        const response = await fetch(`https://headless.tebex.io/api/accounts/${STORE_PUBLIC_KEY}/baskets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currency: "USD" })
        });
        const result = await response.json();
        basketIdent = result.data.ident;
        localStorage.setItem("sakuravoid_tebex_basket_ident", basketIdent);
    }
    return basketIdent;
}

// Add a package to the basket
async function addPackageToBasket(packageId) {
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

        if (!response.ok) {
            const errorDetails = await response.json();
            console.error("TEBEX 422 VALIDATION DETAIL:", JSON.stringify(errorDetails, null, 2));
            throw new Error("Failed to add package to basket.");
        }

        alert("Package successfully added to your cart!");
    } catch (err) {
        console.error(err);
        alert("Could not add package. Check your F12 Browser Console.");
    }
}

// Initialize and launch Tebex.js Checkout popup
async function launchCheckout() {
    const basketIdent = localStorage.getItem("sakuravoid_tebex_basket_ident");
    const username = localStorage.getItem("sakuravoid_username");

    if (!basketIdent) {
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