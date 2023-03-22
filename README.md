# stripe-cleanup

This repo helps to find and delete non-paying custoemrs from Stripe:

### setup:

1. yarn `npm install`
2. Add `.env` file at the root
3. Add `STRIPE_API_KEY` environment variable with the value of Stripe API secret key

### Find non-paying customers:

1. run `yarn find`
2. A `output.csv` file should be created in the root folder with the customers list

### Delete non-paying customers:

1. run `yarn delete` 
