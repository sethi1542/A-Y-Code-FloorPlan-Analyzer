import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { loadStripe } from "@stripe/stripe-js";
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Info, 
  Star, 
  RefreshCw,
  Loader2,
  Gift,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

const stripePromise = loadStripe('pk_test_51P...'); // Replace with your test key

const plans = [
  {
    name: "Free Trial",
    price: "Free for 7 Days",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "10 credits, Basic mode only.",
    credits: 10,
    modes: ["Basic"],
    planKey: "free",
    highlight: false
  },
  {
    name: "Basic",
    price: "$10/month or $100/year",
    monthlyPrice: 10,
    yearlyPrice: 100,
    description: "15 credits/month. All modes allowed.",
    credits: 15,
    modes: ["Basic", "Increased", "Windows Only"],
    planKey: "basic",
    highlight: false
  },
  {
    name: "Pro",
    price: "$25/month or $250/year",
    monthlyPrice: 25,
    yearlyPrice: 250,
    description: "40 credits/month. All modes allowed.",
    credits: 40,
    modes: ["Basic", "Increased", "Windows Only"],
    planKey: "pro",
    highlight: true
  },
];

const creditPacks = [
  { amount: 5, label: "5 Credits ($5.00)" },
  { amount: 10, label: "10 Credits ($10.00)" },
  { amount: 20, label: "20 Credits ($19.00)" },
  { amount: 50, label: "50 Credits ($47.50)" },
];

export default function Subscription() {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [currentPlanData, setCurrentPlanData] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buyCreditsOption, setBuyCreditsOption] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [autoRenew, setAutoRenew] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCreditPaymentModal, setShowCreditPaymentModal] = useState(false);
  const [creditPaymentMethod, setCreditPaymentMethod] = useState('stripe');
  const [creditPaymentStatus, setCreditPaymentStatus] = useState(null);
  const [creditPaymentProcessing, setCreditPaymentProcessing] = useState(false);
  const { user, token } = useContext(AuthContext);

  useEffect(() => {
    const fetchCurrentPlan = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axios.get("/api/subscription", {
          headers: {
            Authorization: `Token ${token}`,
          },
        });
        
        if (res.data) {
          setCurrentPlan(res.data.plan);
          setCurrentPlanData(res.data);
          if (res.data.plan) {
            setSelectedPlan(res.data.plan);
            setBillingCycle(res.data.billing_cycle || 'monthly');
            setAutoRenew(res.data.auto_renew !== false);
          }
        }
      } catch (err) {
        console.error("Failed to fetch plan:", err);
        setError(err.response?.data?.error || "Failed to load subscription data");
      } finally {
        setIsLoading(false);
      }
    };

    if (user && token) {
      fetchCurrentPlan();
    }
  }, [user, token]);

  useEffect(() => {
    const handlePayPalReturn = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const paymentId = sessionStorage.getItem('paypal_payment_id');
      const creditPaymentId = sessionStorage.getItem('paypal_credit_payment_id');
      
      if (token && paymentId) {
        try {
          setPaymentProcessing(true);
          const res = await axios.post("/api/payment-confirm/", {
            payment_id: paymentId,
            payment_method: 'paypal',
            order_id: token,
            plan: selectedPlan,
            billing_cycle: billingCycle,
            auto_renew: autoRenew
          }, {
            headers: { Authorization: `Token ${token}` }
          });
          
          setCurrentPlan(selectedPlan);
          setCurrentPlanData(res.data);
          setPaymentStatus('completed');
          alert(`Payment successful! You're now subscribed to ${selectedPlan} plan.`);
          
          window.history.replaceState({}, document.title, window.location.pathname);
          sessionStorage.removeItem('paypal_payment_id');
        } catch (err) {
          console.error("Payment verification failed:", err);
          setPaymentStatus('failed');
          alert(`Payment verification failed: ${err.response?.data?.error || err.message}`);
        } finally {
          setPaymentProcessing(false);
          setPaymentStatus(null);
        }
      }
      
      if (token && creditPaymentId) {
        try {
          setCreditPaymentProcessing(true);
          const res = await axios.post("/api/confirm-credit-payment/", {
            payment_id: creditPaymentId,
            payment_method: 'paypal',
            order_id: token
          }, {
            headers: { Authorization: `Token ${token}` }
          });
          
          const subscriptionRes = await axios.get("/api/subscription", {
            headers: { Authorization: `Token ${token}` }
          });
          setCurrentPlan(subscriptionRes.data.plan);
          setCurrentPlanData(subscriptionRes.data);
          alert(`Successfully purchased credits!`);
          
          window.history.replaceState({}, document.title, window.location.pathname);
          sessionStorage.removeItem('paypal_credit_payment_id');
        } catch (err) {
          console.error("Payment verification failed:", err);
          alert(`Payment verification failed: ${err.response?.data?.error || err.message}`);
        } finally {
          setCreditPaymentProcessing(false);
          setShowCreditPaymentModal(false);
        }
      }
    };
    
    handlePayPalReturn();
  }, [selectedPlan, billingCycle, autoRenew, token]);

  const handleSubscribe = async (planKey) => {
    if (currentPlan === planKey) return;
    
    if (planKey === 'free') {
      // Check if user already had free trial
      if (currentPlanData?.had_free_trial) {
        alert("You can only use the free trial once");
        return;
      }

      setIsLoading(true);
      try {
        const res = await axios.post("/api/subscription/", { 
          plan: planKey,
          payment_method: 'none'
        }, {
          headers: { Authorization: `Token ${token}` }
        });
        
        setCurrentPlan(planKey);
        setCurrentPlanData(res.data);
        alert("Free trial activated for 7 days!");
      } catch (err) {
        console.error("Subscription failed:", err);
        alert(`Subscription failed: ${err.response?.data?.error || err.message}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setSelectedPlan(planKey);
    setPaymentStatus('initiating');
  };

  const initiatePayment = async () => {
    if (!selectedPlan) return;
    
    setPaymentProcessing(true);
    try {
      const res = await axios.post("/api/subscription/", { 
        plan: selectedPlan,
        payment_method: paymentMethod,
        billing_cycle: billingCycle,
        auto_renew: autoRenew
      }, {
        headers: { Authorization: `Token ${token}` }
      });

      if (paymentMethod === 'stripe') {
        const stripe = await stripePromise;
        const { error } = await stripe.confirmPayment({
          clientSecret: res.data.client_secret,
          confirmParams: {
            return_url: window.location.href,
          },
        });
        
        if (error) throw error;

        const verifyRes = await axios.post("/api/payment-confirm/", {
          payment_id: res.data.payment_id,
          payment_method: 'stripe',
          payment_intent_id: res.data.payment_intent_id,
          plan: selectedPlan,
          billing_cycle: billingCycle,
          auto_renew: autoRenew
        }, {
          headers: { Authorization: `Token ${token}` }
        });

        setCurrentPlan(selectedPlan);
        setCurrentPlanData(verifyRes.data);
        setPaymentStatus('completed');
        alert(`Payment successful! You're now subscribed to ${selectedPlan} plan.`);
      } else if (paymentMethod === 'paypal') {
        sessionStorage.setItem('paypal_payment_id', res.data.payment_id);
        window.location.href = res.data.approval_url;
      }
    } catch (err) {
      console.error("Payment failed:", err);
      setPaymentStatus('failed');
      alert(`Payment failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setPaymentProcessing(false);
      setPaymentStatus(null);
    }
  };

  const handleBuyCredits = async () => {
    if (!currentPlan || (currentPlan !== "basic" && currentPlan !== "pro")) {
      alert("Please subscribe to Basic or Pro plan first");
      return;
    }
    setShowCreditPaymentModal(true);
  };

  const handleConfirmCreditPurchase = async () => {
    setCreditPaymentProcessing(true);
    try {
      const res = await axios.post("/api/purchase-credits/", {
        credits: buyCreditsOption,
        payment_method: creditPaymentMethod
      }, {
        headers: { Authorization: `Token ${token}` }
      });

      if (creditPaymentMethod === 'stripe') {
        const stripe = await stripePromise;
        const { error } = await stripe.confirmPayment({
          clientSecret: res.data.client_secret,
          confirmParams: {
            return_url: window.location.href,
          },
        });
        
        if (error) throw error;

        const verifyRes = await axios.post("/api/confirm-credit-payment/", {
          payment_id: res.data.payment_id,
          payment_intent_id: res.data.payment_intent_id,
          payment_method: 'stripe'
        }, {
          headers: { Authorization: `Token ${token}` }
        });

        const subscriptionRes = await axios.get("/api/subscription", {
          headers: { Authorization: `Token ${token}` }
        });
        setCurrentPlan(subscriptionRes.data.plan);
        setCurrentPlanData(subscriptionRes.data);
        alert(`Successfully purchased ${buyCreditsOption} credits!`);

      } else if (creditPaymentMethod === 'paypal') {
        sessionStorage.setItem('paypal_credit_payment_id', res.data.payment_id);
        window.location.href = res.data.approval_url;
      }

      setShowCreditPaymentModal(false);
    } catch (err) {
      console.error("Credit purchase failed:", err);
      alert(`Payment failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setCreditPaymentProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const res = await axios.post("/api/cancel-subscription/", {}, {
        headers: { Authorization: `Token ${token}` }
      });
      setAutoRenew(false);
      setCurrentPlanData(prev => ({ ...prev, auto_renew: false }));
      setShowCancelConfirm(false);
      alert("Your subscription will not auto-renew. You can continue using the service until your current period ends.");
    } catch (err) {
      console.error("Failed to cancel subscription:", err);
      alert(`Failed to cancel subscription: ${err.response?.data?.error || err.message}`);
    }
  };

  if (isLoading && !currentPlanData) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-black text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-black bg-opacity-90 px-4 py-8 relative text-white">
        <div className="absolute inset-0 bg-black bg-opacity-70 z-0"></div>
        <div className="relative z-10 container mx-auto">
          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl shadow-md">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-4">Subscription Error</h1>
            <div className="p-3 bg-red-900/60 text-red-200 border border-red-600 rounded flex items-center">
              <XCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2 rounded-full"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-black bg-opacity-90 px-4 py-8 relative text-white">
      <div className="absolute inset-0 bg-black bg-opacity-70 z-0"></div>
      <div className="relative z-10 container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Payment Modal */}
          {paymentStatus === 'initiating' && (
            <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-white">Complete Payment</h2>
                <p className="mb-4 text-gray-300">You're subscribing to the <strong className="text-blue-400">{selectedPlan}</strong> plan.</p>
                
                <div className="mb-4">
                  <label className="block mb-2 font-medium text-gray-300">Billing Cycle</label>
                  <select 
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value)}
                    className="border border-gray-700 bg-gray-800 text-white p-2 rounded w-full mb-4"
                    disabled={paymentProcessing}
                  >
                    <option value="monthly">Monthly Billing</option>
                    <option value="yearly">Annual Billing (2 months free)</option>
                  </select>
                  
                  <label className="block mb-2 font-medium text-gray-300">Payment Method</label>
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="border border-gray-700 bg-gray-800 text-white p-2 rounded w-full"
                    disabled={paymentProcessing}
                  >
                    <option value="stripe">Credit/Debit Card (Stripe)</option>
                    <option value="paypal">PayPal</option>
                  </select>
                  
                  <div className="mt-4 flex items-center">
                    <input
                      type="checkbox"
                      id="autoRenew"
                      checked={autoRenew}
                      onChange={(e) => setAutoRenew(e.target.checked)}
                      className="mr-2 bg-gray-800 border-gray-700"
                      disabled={paymentProcessing}
                    />
                    <label htmlFor="autoRenew" className="text-gray-300">Auto-renew subscription</label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    onClick={() => setPaymentStatus(null)}
                    className="px-4 py-2 border border-gray-700 text-gray-300 rounded hover:bg-gray-800"
                    disabled={paymentProcessing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={initiatePayment}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded hover:from-blue-500 hover:to-purple-500"
                    disabled={paymentProcessing}
                  >
                    {paymentProcessing ? (
                      <span className="flex items-center">
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Processing...
                      </span>
                    ) : 'Continue to Payment'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Credit Payment Modal */}
          {showCreditPaymentModal && (
            <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-white">Purchase Credits</h2>
                <p className="mb-4 text-gray-300">
                  You're purchasing <strong>{buyCreditsOption} credits</strong>
                </p>
                
                <div className="mb-4">
                  <label className="block mb-2 font-medium text-gray-300">Payment Method</label>
                  <select 
                    value={creditPaymentMethod}
                    onChange={(e) => setCreditPaymentMethod(e.target.value)}
                    className="border border-gray-700 bg-gray-800 text-white p-2 rounded w-full"
                    disabled={creditPaymentProcessing}
                  >
                    <option value="stripe">Credit/Debit Card (Stripe)</option>
                    <option value="paypal">PayPal</option>
                  </select>
                </div>
                
                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    onClick={() => setShowCreditPaymentModal(false)}
                    className="px-4 py-2 border border-gray-700 text-gray-300 rounded hover:bg-gray-800"
                    disabled={creditPaymentProcessing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmCreditPurchase}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded hover:from-blue-500 hover:to-purple-500"
                    disabled={creditPaymentProcessing}
                  >
                    {creditPaymentProcessing ? (
                      <span className="flex items-center">
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Processing...
                      </span>
                    ) : 'Complete Purchase'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cancel Confirmation Modal */}
          {showCancelConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-white">Cancel Subscription</h2>
                <p className="mb-4 text-gray-300">Are you sure you want to cancel your subscription? You'll have access until the end of your current billing period.</p>
                
                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="px-4 py-2 border border-gray-700 text-gray-300 rounded hover:bg-gray-800"
                  >
                    Keep Subscription
                  </button>
                  <button
                    onClick={handleCancelSubscription}
                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded hover:from-red-500 hover:to-pink-500"
                  >
                    Confirm Cancellation
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Subscription Plans</h1>
            <div className="mt-2 flex items-center text-gray-300">
              <CreditCard className="h-5 w-5 mr-2 text-blue-400" />
              <span>Choose the plan that fits your needs</span>
            </div>
          </div>

          {currentPlanData && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8 shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-white flex items-center">
                <Star className="h-5 w-5 mr-2 text-yellow-400" />
                Your Current Plan
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                  <span className="text-gray-300">Plan: <strong className="capitalize text-white">{currentPlanData.plan || 'None'}</strong></span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-400" />
                  <span className="text-gray-300">
                    {currentPlanData.plan === 'free' ? 'Expires' : currentPlanData.auto_renew ? 'Renews' : 'Expires'} on: {' '}
                    <strong className="text-white">
                      {currentPlanData.expiry_date ? new Date(currentPlanData.expiry_date).toLocaleDateString() : 'N/A'}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center">
                  <Info className="h-5 w-5 mr-2 text-purple-400" />
                  <span className="text-gray-300">Credits: <strong className="text-white">{currentPlanData.remaining_credits || 0}</strong></span>
                </div>
              </div>
              {currentPlanData.plan && currentPlanData.plan !== 'free' && currentPlanData.auto_renew && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="mt-4 text-sm text-red-400 hover:text-red-300 flex items-center"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancel Subscription
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {plans.map((plan) => (
              <motion.div
                key={plan.name}
                whileHover={{ scale: plan.planKey === 'free' && currentPlanData?.had_free_trial ? 1 : 1.02 }}
                className={`border rounded-xl p-6 shadow-md transition ${
                  currentPlan === plan.planKey
                    ? "border-blue-600 bg-gray-800"
                    : "border-gray-800 bg-gray-900"
                } ${
                  plan.highlight ? "ring-2 ring-purple-500" : ""
                } ${
                  plan.planKey === 'free' && currentPlanData?.had_free_trial 
                    ? "opacity-60 cursor-not-allowed" 
                    : ""
                }`}
              >
                {plan.highlight && (
                  <div className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full inline-block mb-2">
                    POPULAR
                  </div>
                )}
                <h2 className="text-2xl font-semibold mb-2 text-white">{plan.name}</h2>
                <p className="text-gray-300 mb-1">{plan.price}</p>
                {plan.planKey !== 'free' && (
                  <p className="text-xs text-green-400 mb-2">
                    {plan.yearlyPrice === 100 ? "Save $20/year" : "Save $50/year"} with annual billing
                  </p>
                )}
                <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
                <ul className="mb-4 text-sm space-y-2">
                  {plan.modes.map((m) => (
                    <li key={m} className="flex items-center text-gray-300">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {m}
                    </li>
                  ))}
                </ul>
                {plan.planKey === 'free' && currentPlanData?.had_free_trial && (
                  <div className="text-sm text-yellow-400 mb-2 flex items-center">
                    <Gift className="h-4 w-4 mr-1" />
                    You've already used your free trial
                  </div>
                )}
                <button
                  className={`w-full py-3 px-4 rounded-full font-semibold transition-all ${
                    currentPlan === plan.planKey
                      ? "bg-green-600 text-white cursor-default"
                      : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white"
                  } ${
                    isLoading ? "opacity-70 cursor-not-allowed" : ""
                  } ${
                    plan.planKey === 'free' && currentPlanData?.had_free_trial
                      ? "bg-gray-600 cursor-not-allowed"
                      : ""
                  }`}
                  onClick={() => handleSubscribe(plan.planKey)}
                  disabled={
                    isLoading || 
                    (currentPlan === plan.planKey) || 
                    (plan.planKey === 'free' && currentPlanData?.had_free_trial)
                  }
                >
                  {isLoading && selectedPlan === plan.planKey
                    ? <span className="flex items-center justify-center"><Loader2 className="animate-spin h-4 w-4 mr-2" /> Processing...</span>
                    : currentPlan === plan.planKey
                    ? "Current Plan"
                    : plan.planKey === 'free' && currentPlanData?.had_free_trial
                    ? "Already Used"
                    : "Select Plan"}
                </button>
              </motion.div>
            ))}
          </div>

          {(currentPlan === "basic" || currentPlan === "pro") && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-white flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-blue-400" />
                Buy Extra Credits
              </h2>
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                <select
                  value={buyCreditsOption}
                  onChange={(e) => setBuyCreditsOption(Number(e.target.value))}
                  className="border border-gray-700 bg-gray-800 text-white p-2 rounded-md w-full sm:w-auto"
                  disabled={isLoading}
                >
                  {creditPacks.map(pack => (
                    <option key={pack.amount} value={pack.amount}>
                      {pack.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBuyCredits}
                  className={`bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-6 rounded-full font-semibold w-full sm:w-auto ${
                    isLoading ? "opacity-70 cursor-not-allowed" : "hover:from-purple-500 hover:to-pink-500"
                  }`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Processing...
                    </span>
                  ) : "Purchase Credits"}
                </button>
              </div>
              <p className="text-xs text-gray-400">
                {currentPlan === "pro"
                  ? "Pro members get 5% discount on extra credits"
                  : "Basic members get 2.5% discount on extra credits"}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}