import stripe
import json
import os

from flask import Flask, render_template, jsonify, request, send_from_directory, redirect
from dotenv import load_dotenv, find_dotenv
from flask_cors import CORS 

# Stripe python client library.
load_dotenv(find_dotenv())

stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
DOMAIN = os.getenv('DOMAIN', 'http://localhost:4242')

# product catalog
PRODUCTS = [
    {"id": "prod_1", "name": "Sweater", "description": "Comfy white sweater.", "price": 5000, "currency": "usd", "image": "sweater.jpg"},
    {"id": "prod_2", "name": "Woolen Scarf", "description": "Handmade wool scarf.", "price": 2500, "currency": "usd", "image": "scarf.jpg"}, 
    {"id": "prod_3", "name": "Socks", "description": "Merino Wool Socks", "price": 4000, "currency": "usd", "image": "socks.jpg"},
    {"id": "prod_4", "name": "Shirt", "description": "Merino Wool Men's shirt", "price": 6500, "currency": "usd", "image": "shirt.jpg"}
]

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

# Handles GET request and sends list of products 
@app.route('/products', methods=['GET'])
def get_products():
    return jsonify(PRODUCTS)

# Handles POST request and receives cart data from client, sums the amount, and calls PaymentIntent()
@app.route('/create-payment-intent', methods=['POST'])
def create_payment_intent():
    try:
        data = request.get_json()

        if not data or "cart" not in data or not isinstance(data["cart"], list) or len(data["cart"]) == 0:
            return jsonify({"error": "Cart is empty"}), 400

        amount = sum(item['price'] * item['quantity'] for item in data['cart'])

        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency='usd',
            automatic_payment_methods={'enabled': True},
        )
        return jsonify({'clientSecret': payment_intent.client_secret})

    except Exception as e:
        return jsonify({'error': str(e)}), 400
# Handles GET request
# received payment status and returns the payment status 
@app.route('/payment-status', methods=['GET'])
def payment_status():
    payment_intent_id = request.args.get('payment_intent')
    
    if not payment_intent_id:
        return jsonify({'error': 'Missing payment_intent'}), 400

    try:
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        return jsonify({
            'status': payment_intent.status,
            'amount_received': payment_intent.amount_received,
            'currency': payment_intent.currency
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# Handles POST requests to /webhook 
# Sends event with webhook signature  
@app.route('/webhook', methods=['POST'])
def webhook_received():
    webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
    request_data = json.loads(request.data)

    if webhook_secret:
        signature = request.headers.get('stripe-signature')
        try:
            event = stripe.Webhook.construct_event(
                payload=request.data, sig_header=signature, secret=webhook_secret)
            data = event['data']
        except Exception as e:
            return jsonify({'error': str(e)}), 400
        event_type = event['type']
    else:
        data = request_data['data']
        event_type = request_data['type']

    print('Received event:', event_type)
    if event_type == 'payment_intent.succeeded':
        return jsonify({'status': 'success'})

if __name__ == '__main__':
    app.run(port=4242, debug=True)
