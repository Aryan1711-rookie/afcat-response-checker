const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;


// Serve your frontend files
app.use(express.static(__dirname));


// ============================================================
// FETCH DIGIALM RESPONSE SHEET
// ============================================================

app.get("/api/fetch-response-sheet", async (req, res) => {

    try {

        const rawUrl =
            String(req.query.url || "").trim();


        // ----------------------------------------------------
        // Validate URL exists
        // ----------------------------------------------------

        if (!rawUrl) {

            return res.status(400).json({
                error: "Missing response-sheet URL."
            });

        }


        // ----------------------------------------------------
        // Parse URL
        // ----------------------------------------------------

        let target;

        try {

            target = new URL(rawUrl);

        } catch {

            return res.status(400).json({
                error: "Invalid URL."
            });

        }


        // ----------------------------------------------------
        // Only allow HTTP / HTTPS
        // ----------------------------------------------------

        if (
            target.protocol !== "http:" &&
            target.protocol !== "https:"
        ) {

            return res.status(400).json({
                error:
                    "Only HTTP and HTTPS URLs are allowed."
            });

        }


        // ----------------------------------------------------
        // Only allow Digialm
        // ----------------------------------------------------

        const hostname =
            target.hostname.toLowerCase();


        const allowed =
            hostname === "digialm.com" ||
            hostname.endsWith(".digialm.com");


        if (!allowed) {

            return res.status(403).json({
                error:
                    "Only Digialm response-sheet URLs are supported."
            });

        }


        // ----------------------------------------------------
        // Timeout
        // ----------------------------------------------------

        const controller =
            new AbortController();


        const timeout =
            setTimeout(
                () => controller.abort(),
                60000
            );


        try {

            // ------------------------------------------------
            // Fetch Digialm page
            // ------------------------------------------------

            const response = await fetch(target.href, {
    method: "GET",
    redirect: "follow",
    signal: controller.signal,

    headers: {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/151.0.0.0 Safari/537.36",

        "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

        "Accept-Language":
            "en-US,en;q=0.9",

        "Connection":
            "keep-alive"
    }
});

            // ------------------------------------------------
            // Check response
            // ------------------------------------------------

            if (!response.ok) {

                return res.status(502).json({

                    error:
                        `Digialm returned HTTP ${response.status}.`

                });

            }


            // ------------------------------------------------
            // Get HTML
            // ------------------------------------------------

            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";


            const html =
                await response.text();


            if (!html.trim()) {

                return res.status(502).json({

                    error:
                        "Digialm returned an empty response."

                });

            }


            // ------------------------------------------------
            // Make sure it looks like HTML
            // ------------------------------------------------

            if (
                !contentType.includes("html") &&
                !/<html[\s>]/i.test(html)
            ) {

                return res.status(502).json({

                    error:
                        "The supplied URL did not return an HTML response sheet."

                });

            }


            // ------------------------------------------------
            // Send HTML back to frontend
            // ------------------------------------------------

            return res.json({

                html: html

            });


        } finally {

            clearTimeout(timeout);

        }


    } catch (error) {

        console.error(
            "Response-sheet fetch failed:",
            error
        );


        // Request timeout
        if (
            error.name === "AbortError"
        ) {

            return res.status(504).json({

                error:
                    "The response sheet took too long to load."

            });

        }


        // Other errors
        return res.status(502).json({

            error:
                "The server could not retrieve this response sheet. " +
                "Try downloading the HTML and uploading it instead."

        });

    }

});


// ============================================================
// START SERVER
// ============================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `AFCAT Response Calculator running at ${PORT}`
        );

    }
);