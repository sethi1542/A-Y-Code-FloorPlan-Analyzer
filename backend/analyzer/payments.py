# analyzer/payments.py

import stripe
from django.conf import settings
from .models import Payment

# Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

class StripePayment:
    @staticmethod
    def create_payment_intent(amount, currency='usd'):
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),  # cents
                currency=currency,
                payment_method_types=['card'],
            )
            return intent
        except Exception as e:
            print(f"Stripe error: {str(e)}")
            return None

    @staticmethod
    def verify_payment(payment_intent_id):
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            return intent.status == 'succeeded'
        except Exception as e:
            print(f"Stripe verification error: {str(e)}")
            return False


# ✅ PayPal SDK imports (fix)
from paypalcheckoutsdk.core import PayPalHttpClient, SandboxEnvironment, LiveEnvironment
from paypalcheckoutsdk.orders import OrdersCreateRequest, OrdersCaptureRequest

class PayPalClient:
    def __init__(self):
        self.client_id = settings.PAYPAL_CLIENT_ID
        self.client_secret = settings.PAYPAL_SECRET_KEY

        if settings.PAYPAL_ENVIRONMENT == "sandbox":
            self.environment = SandboxEnvironment(self.client_id, self.client_secret)
        else:
            self.environment = LiveEnvironment(self.client_id, self.client_secret)

        self.client = PayPalHttpClient(self.environment)

class PayPalPayment:
    @staticmethod
    def create_order(amount, currency='USD'):
        try:
            request = OrdersCreateRequest()
            request.prefer("return=representation")
            request.request_body({
                "intent": "CAPTURE",
                "purchase_units": [{
                    "amount": {
                        "currency_code": currency,
                        "value": str(amount)
                    }
                }]
            })

            paypal_client = PayPalClient()
            response = paypal_client.client.execute(request)
            return response.result
        except Exception as e:
            print(f"PayPal create order error: {str(e)}")
            return None

    @staticmethod
    def capture_order(order_id):
        try:
            request = OrdersCaptureRequest(order_id)
            request.prefer("return=representation")

            paypal_client = PayPalClient()
            response = paypal_client.client.execute(request)
            return response.result
        except Exception as e:
            print(f"PayPal capture error: {str(e)}")
            return None
