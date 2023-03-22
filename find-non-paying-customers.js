require("dotenv").config();

if (!process.env.STRIPE_API_KEY) {
  throw new Error("Please set STRIPE_API_KEY as environment variable");
}

const fs = require("fs");
const stripe = require("stripe")(process.env.STRIPE_API_KEY);

function customerHasPayment(customer) {
  return (
    !!customer.default_source ||
    !!customer.invoice_settings?.default_payment_method
  );
}

async function start() {
  const nonPaidCustomers = [];
  let hasMore = true;
  let page;
  while (hasMore) {
    const customersSearchResult = await stripe.customers.search({
      // query is a required field, so we search only for customers with a defined name
      query: "-name:null",
      limit: 30,
      page,
    });

    hasMore = customersSearchResult.has_more;
    page = customersSearchResult.next_page;

    nonPaidCustomers.push(
      ...customersSearchResult.data.filter(
        (customer) => !customerHasPayment(customer)
      )
    );
  }

  const customersData = nonPaidCustomers.map((customer) => ({
    billing_id: customer.id,
    customer_name: customer.name,
  }));

  console.log(
    `Found ${nonPaidCustomers.length} customers without payment method`
  );

  if (customersData.length) {
    const csvHeader = Object.keys(customersData[0]).join(",") + "\n";
    const csvRows = customersData
      .map((obj) => Object.values(obj).join(",") + "\n")
      .join("");
    fs.writeFile("output.csv", csvHeader + csvRows, (err) => {
      if (err) throw err;
      console.log("CSV file has been saved!");
    });
  }
}

start();
