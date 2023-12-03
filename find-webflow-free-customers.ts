require("dotenv").config();

import Stripe from "stripe";
import { writeFile } from "fs";
import { keys, isEmpty } from "lodash";

if (!process.env.STRIPE_API_KEY) {
  throw new Error("Please set STRIPE_API_KEY as environment variable");
}

function customerIsFree(customer: Stripe.Customer) {
  const hasNoPaymentMethod =
    !customer.default_source &&
    customer.invoice_settings?.default_payment_method;
  const hasOnlyStiggMetadata =
    keys(customer.metadata).length === 2 &&
    !!customer.metadata.stiggCustomerId &&
    !!customer.metadata.stiggEntityUrl;
  const hasNoSubscriptions = isEmpty(customer.subscriptions?.data);

  return hasNoPaymentMethod && hasOnlyStiggMetadata && hasNoSubscriptions;
}

async function start() {
  const stripe = new Stripe(process.env.STRIPE_API_KEY, {
    apiVersion: "2022-11-15",
  });
  const freeCustomers = [];
  let hasMore = true;
  let page;
  while (hasMore) {
    const customersSearchResult = await stripe.customers.search({
      // query customers created between Webflow rollout to Stigg fix:
      // 1699833600 = November 13, 2023 12:00:00 AM
      // 1701195300 = November 28, 2023 6:15:00 PM
      query: "created > 1699833600 AND customer.created < 1701195300",
      limit: 30,
      page,
      expand: ["subscriptions"],
    });

    hasMore = customersSearchResult.has_more;
    page = customersSearchResult.next_page;

    freeCustomers.push(
      ...customersSearchResult.data.filter(
        (customer) => !customerIsFree(customer)
      )
    );
  }

  const customersData = freeCustomers.map((customer) => ({
    billing_id: customer.id,
    customer_name: customer.name,
    subscriptions_count: customer.subscriptions?.data.length,
  }));

  console.log(`Found ${freeCustomers.length} free customers`);

  if (customersData.length) {
    const csvHeader = Object.keys(customersData[0]).join(",") + "\n";
    const csvRows = customersData
      .map((obj) => Object.values(obj).join(",") + "\n")
      .join("");
    writeFile("output.csv", csvHeader + csvRows, (err) => {
      if (err) throw err;
      console.log("CSV file has been saved!");
    });
  }
}

start();
