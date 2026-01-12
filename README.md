# Bridg Pay

Bridg Pay is a Next.js-based payment gateway application that integrates WooCommerce with Stripe to handle secure payments and subscriptions. It provides a seamless checkout experience with real-time synchronization between WooCommerce and Stripe.

## Features

### Core Functionality
- **Secure Payment Processing**: Integrates Stripe Checkout for secure payment handling
- **Subscription Management**: Supports both one-time payments and recurring subscriptions
- **Order Synchronization**: Automatically syncs order and subscription statuses between WooCommerce and Stripe
- **Webhook Handling**: Processes Stripe and WooCommerce webhooks for real-time updates
- **Payment Status Tracking**: Provides user-friendly payment status pages with animations
- **Subscription Cancellation**: Allows users to cancel subscriptions with automatic sync
- **Activity Logging**: Comprehensive logging system stored in MongoDB for monitoring and debugging

 ### Technical Features
- **API Routes**: RESTful API endpoints for all payment operations
- **Database Integration**: MongoDB for logging and event tracking
- **Error Handling**: Robust error handling and validation
- **Environment Configuration**: Secure environment variable management
- **TypeScript Support**: Configured for TypeScript development

## API Endpoints

### Payment Processing
- `GET /` - Main payment page (requires `orderid` query parameter)
- `POST /api/fetch-order-details` - Retrieves order information from WooCommerce
- `POST /api/create-payment-session` - Creates Stripe checkout session for one-time payments
- `POST /api/create-combined-session` - Creates Stripe checkout session for payments with subscriptions

### Webhooks
- `POST /api/stripe-webhook` - Handles Stripe webhook events
- `POST /api/woo-webhook` - Handles WooCommerce webhook events
- `POST /api/test/stripe-webhook` - Test endpoint for Stripe webhooks

### Subscription Management
- `POST /api/cancel-subscription` - Cancels subscriptions in both Stripe and WooCommerce

### Monitoring
- `GET /api/logs` - Retrieves system logs
- `GET /logs` - Web interface for viewing logs

### Status Pages
- `GET /payment-status` - Payment success/failure status page
- `GET /cancel` - Subscription cancellation confirmation page

## Usage

### Initiating Payment
To start a payment process, redirect users to:
```
https://your-domain.com/?orderid={WOOCOMMERCE_ORDER_ID}
```

The application will:
1. Fetch order details from WooCommerce
2. Check for associated subscriptions
3. Create appropriate Stripe checkout session
4. Redirect user to Stripe's secure checkout page

### Environment Variables
Configure the following environment variables:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# WooCommerce Configuration
SITE_URL=https://your-woocommerce-site.com
CONSUMER_KEY=ck_...
CONSUMER_SECRET=cs_...

# Webhook Secrets
STRIPE_HOOK_SIGNIN_SECRET=whsec_...
WC_WEBHOOK_SECRET=your_webhook_secret

# MongoDB
MONGODB_URI=mongodb+srv://...

# Success/Cancel URLs
SUCCESS_URL=https://your-domain.com
NEXT_PUBLIC_HOMEPAGE=https://your-store.com

# Optional: Google Analytics
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-...
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bridgpay-new
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env.local` file with the required environment variables listed above.

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Other Platforms
The application can be deployed to any platform supporting Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- Self-hosted with Node.js

### Requirements
- Node.js 18+
- MongoDB database
- WooCommerce store with REST API enabled
- Stripe account with webhook endpoints configured

## Webhook Configuration

### Stripe Webhooks
Configure the following webhook events in your Stripe dashboard:
- `checkout.session.completed`
- `payment_intent.succeeded`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Webhook URL: `https://your-domain.com/api/stripe-webhook`

### WooCommerce Webhooks
Configure webhooks in WooCommerce for:
- Subscription updates
- Order updates

Webhook URL: `https://your-domain.com/api/woo-webhook`

## Architecture

### Data Flow
1. User clicks payment link with order ID
2. Application fetches order details from WooCommerce
3. Creates Stripe checkout session based on order type
4. User completes payment on Stripe
5. Stripe sends webhook to update WooCommerce order status
6. WooCommerce sends webhook to sync subscription changes

### Database Schema
- **logs**: Stores system events and webhook activities
- **processed_events**: Tracks processed webhook events to prevent duplicates

## Technologies Used

- **Framework**: Next.js 16
- **Frontend**: React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB
- **Payment**: Stripe
- **E-commerce**: WooCommerce
- **Animations**: Lottie Web
- **Analytics**: Google Analytics (optional)

## Development

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure
```
src/
├── app/
│   ├── api/           # API routes
│   ├── cancel/        # Cancellation page
│   ├── logs/          # Logs dashboard
│   ├── payment-status/# Payment status page
│   ├── lottie/        # Animation files
│   ├── globals.css    # Global styles
│   ├── layout.js      # Root layout
│   └── page.js        # Main payment page
```

## Security

- Webhook signature verification
- Environment variable protection
- Input validation and sanitization
- Secure API key management
- HTTPS enforcement in production

## Support

For support or questions:
- Check the logs page for system activity
- Verify webhook configurations
- Ensure all environment variables are set correctly
- Confirm WooCommerce REST API is enabled

## License

This project is proprietary software for Bridg Pay applications.
