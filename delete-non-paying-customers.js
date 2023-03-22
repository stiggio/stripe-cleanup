require("dotenv").config();

if (!process.env.STRIPE_API_KEY) {
  throw new Error("Please set STRIPE_API_KEY as environment variable");
}

const stripe = require("stripe")(process.env.STRIPE_API_KEY);

function customerHasPayment(customer) {
  return (
    customer.default_source || customer.invoice_settings?.default_payment_method
  );
}

const keypress = async () => {
  process.stdin.setRawMode(true);
  return new Promise((resolve) =>
    process.stdin.once("data", () => {
      process.stdin.setRawMode(false);
      resolve();
    })
  );
};

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

  if (nonPaidCustomers.length > 0) {
    console.log(
      `Found ${nonPaidCustomers.length} customers without payment method`
    );
    console.log("Press any key to delete these customers");
    await keypress();

    for (let customer of customersData) {
      console.log(
        `deleting customer ${customer.customer_name} - ${customer.billing_id}`
      );
      await stripe.customers.del(customer.billing_id);
    }

    console.log("Finished deleting customers!");
  } else {
    console.log(
      `Found ${nonPaidCustomers.length} customers without payment method`
    );
  }
}

start();
