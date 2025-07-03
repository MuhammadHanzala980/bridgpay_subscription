// const { createServer } = require("http");
// const { parse } = require("url");
// const next = require("next");









// CONSUMER_KEY="ck_3e6906990620d332afa9e1971fb6655959fec7db"
// CONSUMER_SECRET="cs_c5fba7f632be77f88b2c561582397ed7db906e62"
// SITE_URL="https://mcdfynew.itrakmedia.com"
// NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_51Ki4otHVNrMztLAopvmG404s5f9NYCEXOTNJUMTjgmmNWgatdwLcO2iR8oZgKNwETDmRG5Sg3b8CgdAGYb25u71n006DkM9zgm"
// STRIPE_SECRET_KEY="sk_test_51Ki4otHVNrMztLAovT7ywVv7lrWcZV3Sm2mAlZfd0vpZsBjH5JY4MucyFF7GdYVHjYsLdyljhuCHgI3ettH7Ft5E00BbPUosji"
// CHECKOUT_URL="https://neogenix.co//checkout/order-received"
// SUCCESS_URL="http://localhost:3000"
// PRODUCT_ID="prod_OYgah2UdA7uPfd"



// const dev = process.env.NODE_ENV !== "production";
// const hostname = "localhost";
// const port = 3000;
// const app = next({ dev, hostname, port });
// const handle = app.getRequestHandler();

// app.prepare().then(() => {
//   createServer(async (req, res) => {
//     try {
//       const parsedUrl = parse(req.url, true);
//       const { pathname, query } = parsedUrl;

//       if (pathname === "/a") {
//         await app.render(req, res, "/a", query);
//       } else if (pathname === "/b") {
//         await app.render(req, res, "/b", query);
//       } else {
//         await handle(req, res, parsedUrl);
//       }
//     } catch (err) {
//       console.error("Error occurred handling", req.url, err);
//       res.statusCode = 500;
//       res.end("internal server error");
//     }
//   })
//     .once("error", (err) => {
//       console.error(err);
//       process.exit(1);
//     })
//     .listen(port, () => {
//       console.log(`> Ready on http://${hostname}:${port}`);
//     });
// });
