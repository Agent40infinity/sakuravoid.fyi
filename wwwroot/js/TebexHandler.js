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

        // Loop through and print each package name and its numeric ID to the console
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

    // Basic format check for Minecraft usernames (3-16 chars, alphanumeric & underscores)
    const isValidFormat = /^[a-zA-Z0-9_]{3,16}$/.test(cleanUsername);
    if (!isValidFormat) {
        return { success: false, message: "Invalid Minecraft username format." };
    }

    try {
        // Query Mojang API to see if the profile exists
        const response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${cleanUsername}`);

        if (!response.ok) {
            return { success: false, message: "Minecraft account does not exist." };
        }

        const data = await response.json();

        if (!data || !data.id) {
            return { success: false, message: "Minecraft account not found." };
        }

        // Account is valid! Save it locally and proceed
        localStorage.setItem("sakuravoid_username", data.name);
        return { success: true, user: data.name };
    } catch (err) {
        console.error("Mojang validation error:", err);
        // Fallback: if browser blocks due to strict CORS rules on api.mojang.com, 
        // you can use a public CORS-friendly proxy or let Tebex checkout validate it.
        return { success: true, user: cleanUsername };
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
                package_id: packageId,
                quantity: 1
            })
        });

        if (!response.ok) {
            // Log the literal validation error message returned by Tebex
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
    if (!basketIdent) {
        alert("Your basket is empty!");
        return;
    }

    Tebex.checkout.init({
        ident: basketIdent,
        theme: "dark",
        colors: [
            { name: "primary", color: "#ffb8e6" },
            { name: "secondary", color: "#232127" }
        ]
    });
    Tebex.checkout.launch();
}