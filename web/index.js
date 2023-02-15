// @ts-check
import * as dotenv from 'dotenv'
dotenv.config();
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import fetch from 'node-fetch'

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import GDPRWebhookHandlers from "./gdpr.js"; 

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT, 10);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: GDPRWebhookHandlers })
);

// All endpoints after this point will require an active session
app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/products/count", async (_req, res) => {
  const countData = await shopify.api.rest.Product.count({
    session: res.locals.shopify.session,
  });
  res.status(200).send(countData);
});

app.get("/api/products/create", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});

app.use(serveStatic(STATIC_PATH, { index: false }));


app.post('/api/labelgenerator', async (_req, res) => {
  const job_response = await fetch('https://api.deliverr.com/parcel-integration/v1/job', {
    method: 'POST',
    headers:{
      'Content-Type': 'application/json',
      'Authorization': "Bearer " + _req.body.access_token,
    },
    body:JSON.stringify({
      'integrationChannelId':'shipstation',
      'estimatedOrderCount': _req.body.value
    }) 
    //'{"integrationChannelId":"shipstation","estimatedOrderCount": _req.body.value}' 
    //'integrationChannelId=shipstation&estimatedOrderCount='+_req.body.value
  });
  //console.log(job_response);
  const final_response = await job_response.text();
  console.log(final_response);
    
    
  res.status(200).send(final_response)
});

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(join(STATIC_PATH, "index.html")));
});



app.listen(PORT);
