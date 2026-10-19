"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/utils/Context/AuthContext';
import { useCart } from '@/components/utils/Context/CartContext';
import toast from 'react-hot-toast';
import api from '@/lib/apiClient';
import SidebarSummary from './components/SidebarSummary';
import StepperHeader from './components/StepperHeader';
import Address from './components/Address';
import Verification from './components/Verification';
import KycNotice from './components/KycNotice';
import { getKycState, kycAllowsOrder } from '@/lib/kyc';
import OwnerSummary from './components/OwnerSummary';
import Payment from './components/Payment';
import { computeOrderTotals } from '@/lib/pricing';

const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount).replace(/\s/g, '');

const STEPS = [
    { id: 1, name: 'Shipping Address' },
    { id: 2, name: 'B2B Verification' },
    { id: 3, name: 'Order Summary' },
    { id: 4, name: 'Payment' }
];

export default function CheckoutPage() {
    const router = useRouter();
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const { cartItems, loading: cartLoading, removeFromCart, warrantyIds } = useCart();

    const [currentStep, setCurrentStep] = useState(1);

    // Address State
    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);

    // Verification State
    const [isVerifying, setIsVerifying] = useState(false);
    const [kyc, setKyc] = useState(null); // { state, missing, remark }
    const [kycData, setKycData] = useState(null);
    const [kycFiles, setKycFiles] = useState({ aadhaar: null, pan: null, gst: null });
    const [isUploadingKyc, setIsUploadingKyc] = useState(false);

    // Payment & Inventory State
    const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
    const [unavailableItems, setUnavailableItems] = useState([]);

    // Wallet State
    const [walletBalance, setWalletBalance] = useState(0);
    const [isWalletLoading, setIsWalletLoading] = useState(true);

    // ==========================================
    // INITIALIZATION & GUARDS
    // ==========================================
    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            router.replace('/login?next=/checkout');
            return;
        }
        if (!cartLoading && cartItems.length === 0 && !isInitiatingPayment) {
            toast.error("Your cart is empty. Redirecting to inventory.");
            router.push('/products');
        }
    }, [isAuthenticated, authLoading, cartItems.length, cartLoading, isInitiatingPayment, router]);

  useEffect(() => {
        const fetchWalletBalance = async () => {
            if (!user?.crm_party_code) {
                setIsWalletLoading(false);
                return;
            }

            try {
                const response = await api.get('/user/ledger');

                if (response.data && response.data.success) {
                    setWalletBalance(Number(response.data.balance) || 0);
                } else {
                    setWalletBalance(0);
                }
            } catch (error) {
                console.error("Failed to fetch wallet balance:", error);
                setWalletBalance(0);
            } finally {
                setIsWalletLoading(false);
            }
        };

        fetchWalletBalance();
    }, [user]);

    // 2. Fetch Addresses. `selectNew` picks the address that was just added.
    const loadAddresses = async (selectNew = false) => {
        try {
            const response = await api.get('/user/addresses');
            let fetchedAddresses = [];

            if (response.data.success) {
                fetchedAddresses = response.data.addresses;
            }

            // Merge the default address from the user profile if it exists
            if (user.address1) {
                const defaultProfileAddress = {
                    addressid: 'default-profile-address',
                    address_type: 'PROFILE DEFAULT',
                    contact_name: user.cust_name,
                    contact_no: user.mobile,
                    plot_no: user.address1,
                    locality: user.address2 || '',
                    city: user.city,
                    state: user.state,
                    pincode: user.pincode,
                    landmark: ''
                };
                fetchedAddresses = [defaultProfileAddress, ...fetchedAddresses];
            }

            const before = new Set(addresses.map((a) => String(a.addressid)));
            setAddresses(fetchedAddresses);

            const added = selectNew ? fetchedAddresses.filter((a) => !before.has(String(a.addressid))).pop() : null;
            if (added) setSelectedAddressId(added.addressid);
            else if (fetchedAddresses.length > 0 && !selectNew) setSelectedAddressId(fetchedAddresses[0].addressid);
        } catch (error) {
            toast.error("Failed to load saved addresses.");
        } finally {
            setIsLoadingAddresses(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated && user?.crm_party_code) loadAddresses();
    }, [isAuthenticated, user]);

    const handleAddAddress = async (values) => {
        try {
            const { data } = await api.post('/user/addresses', values);
            if (!data?.success) {
                toast.error(data?.message || "Could not save the address.");
                return false;
            }
            toast.success("Address added.");
            await loadAddresses(true);
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not save the address.");
            return false;
        }
    };

    // ==========================================
    // CALCULATIONS
    // ==========================================
    // Display only. The server recalculates the same totals before charging.
    const totals = computeOrderTotals(cartItems, walletBalance, warrantyIds);
    const totalRequestAmount = totals.total;
    const applicableWalletAmount = totals.walletAmount;
    const finalPayable = totals.payable;

    // ==========================================
    // PIPELINE HANDLERS
    // ==========================================
    const handleProceedToVerification = () => {
        if (!selectedAddressId) return toast.error("Please select a shipping address.");
        setCurrentStep(2);
        fetchKycStatus();
    };

    const fetchKycStatus = async () => {
        setIsVerifying(true);
        try {
            const response = await api.get('/user/kyc');
            if (response.data?.success) {
                const data = response.data.kycData;
                setKycData(data);
                setKyc(response.data.kyc || getKycState(data));
                return response.data.kyc || getKycState(data);
            }
        } catch (error) {
            toast.error("Could not verify B2B status.");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleFileChange = (e, documentType) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
            toast.error("Only JPG, JPEG, and PNG files are allowed.");
            e.target.value = ''; 
            return;
        }
        setKycFiles(prev => ({ ...prev, [documentType]: file }));
    };

    const handleKycUpload = async (e) => {
        e.preventDefault();

        if (!kycData?.aadhar_img && !kycFiles.aadhaar) return toast.error("Aadhaar image is required.");
        if (!kycData?.pan_img && !kycFiles.pan) return toast.error("PAN image is required.");
        if (!kycData?.gst_img && !kycFiles.gst) return toast.error("GST Certificate image is required.");

        setIsUploadingKyc(true);
        const toastId = toast.loading("Uploading business documents...");

        try {
            const formData = new FormData();
            if (kycFiles.aadhaar) formData.append('aadhaar_image', kycFiles.aadhaar);
            if (kycFiles.pan) formData.append('pan_image', kycFiles.pan);
            if (kycFiles.gst) formData.append('gst_image', kycFiles.gst);

            const response = await api.post('/user/kyc/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                toast.success("Documents uploaded. They will be reviewed by our team.", { id: toastId });
                setKycFiles({ aadhaar: null, pan: null, gst: null });
                // Re-read the status from the server instead of assuming it is approved.
                const fresh = await fetchKycStatus();
                if (!fresh || fresh.state === 'missing') {
                    const uploadedData = { ...kycData, aadhar_img: 'uploaded', pan_img: 'uploaded', gst_img: 'uploaded', kyc_status: kycData?.kyc_status || 'PENDING' };
                    setKycData(uploadedData);
                    setKyc(getKycState(uploadedData));
                }
            } else {
                toast.error(response.data.message || "Upload failed.", { id: toastId });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Server error during upload.", { id: toastId });
        } finally {
            setIsUploadingKyc(false);
        }
    };

    const handleProceedToSummary = () => {
        if (!kycAllowsOrder(kyc)) return toast.error("Please upload your business documents first.");

        const outOfStockIds = cartItems
            .filter(item => item.product.isStock !== "Available" || item.product.stock < item.quantity)
            .map(item => item.product.id);

        setUnavailableItems(outOfStockIds);

        if (outOfStockIds.length > 0) {
            toast.error("Some items in your cart are no longer available.");
        } else {
            setCurrentStep(3);
        }
    };

    // The server prices the cart, creates the PO and opens the payment session.
    // Invoices are only created by the server after it verifies the payment.
    const handleInitiatePayment = async (gateway, option) => {
        setIsInitiatingPayment(true);
        const toastId = toast.loading('Creating purchase order...');

        try {
            const { data } = await api.post('/checkout', { addressId: selectedAddressId, gateway, option, warrantyIds });
            console.log('[checkout-debug] /api/checkout reply', { success: data.success, completed: data.completed, orderId: data.orderId, gateway: data.gateway, hasSessionId: Boolean(data.sessionId), hasPaymentUrl: Boolean(data.paymentUrl), message: data.message });

            if (!data.success) {
                toast.error(data.message || 'Failed to start payment.', { id: toastId });
                setIsInitiatingPayment(false);
                return;
            }

            const statusUrl = `/checkout/status?order_id=${encodeURIComponent(data.orderId)}`;

            if (data.completed) {
                toast.success('Paid from wallet. Order complete!', { id: toastId });
                router.push(`${statusUrl}&method=wallet`);
                return;
            }

            if (data.gateway === 'HDFC') {
                toast.success('Redirecting to secure gateway...', { id: toastId });
                window.location.href = data.paymentUrl;
                return;
            }

            // Cashfree checkout script is loaded only when the buyer pays.
            if (!data.sessionId) {
                toast.error('Payment session could not be created. Please try again.', { id: toastId });
                setIsInitiatingPayment(false);
                return;
            }

            const { load } = await import('@cashfreepayments/cashfree-js');
            // Use the mode the server created the session in; a mismatch makes Cashfree
            // reject the session as invalid.
            const cashfree = await load({ mode: data.cashfreeMode === 'production' ? 'production' : 'sandbox' });
            toast.dismiss(toastId);

            const result = await cashfree.checkout({ paymentSessionId: data.sessionId, redirectTarget: '_modal' });
            console.log('[checkout-debug] Cashfree modal finished', { error: result?.error || null, paymentDetails: result?.paymentDetails || null, redirect: Boolean(result?.redirect) });

            if (result?.error) {
                toast.error('Payment failed: ' + result.error.message);
                setIsInitiatingPayment(false);
            } else {
                // The status page asks the server to verify the payment and create the invoice.
                router.push(statusUrl);
            }
        } catch (error) {
            console.log('[checkout-debug] checkout request failed', { status: error.response?.status, data: error.response?.data, message: error.message });
            const message = error.response?.data?.message || 'Network error while connecting to bank.';
            if (error.response?.data?.unavailable) setUnavailableItems(error.response.data.unavailable);
            // Documents went missing since step 2: send the buyer back to upload them.
            if (error.response?.data?.code === 'KYC_MISSING') { setCurrentStep(2); fetchKycStatus(); }
            toast.error(message, { id: toastId });
            setIsInitiatingPayment(false);
        }
    };

    const handleProceedToPayment = () => {
        setCurrentStep(4);
    };

    // ==========================================
    // RENDER HELPERS
    // ==========================================
    if (authLoading || cartLoading) {
        return <div className="min-h-screen bg-[#F8FAFC] flex justify-center py-20"><div className="w-10 h-10 border-4 border-[#1B5E3B]/20 border-t-[#1B5E3B] rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 py-12">
            <div className="container mx-auto px-4 max-w-[1000px]">

                {/* Stepper Header */}
                <StepperHeader currentStep={currentStep} STEPS={STEPS} />

                <div className="flex flex-col lg:flex-row gap-8 mt-16">
                    {/* LEFT COLUMN: Main Steps */}
                    <div className="lg:w-[65%] w-full">

                        {/* STEP 1: ADDRESS */}
                        {currentStep === 1 && (
                            <Address
                                addresses={addresses}
                                selectedAddressId={selectedAddressId}
                                setSelectedAddressId={setSelectedAddressId}
                                isLoadingAddresses={isLoadingAddresses}
                                onAddAddress={handleAddAddress}
                                defaultName={user?.cust_name || ''}
                                defaultMobile={user?.mobile || ''}
                                handleProceedToVerification={handleProceedToVerification}
                            />
                        )}

                        {/* STEP 2: VERIFICATION */}
                        {currentStep === 2 && (
                            <Verification
                                isVerifying={isVerifying}
                                kyc={kyc}
                                kycData={kycData}
                                isUploadingKyc={isUploadingKyc}
                                handleKycUpload={handleKycUpload}
                                handleFileChange={handleFileChange}
                                handleProceedToSummary={handleProceedToSummary}
                            />
                        )}

                        {/* STEP 3: ORDER SUMMARY */}
                        {currentStep === 3 && (
                            <>
                            {(kyc?.state === 'pending' || kyc?.state === 'rejected') && <div className="mb-4"><KycNotice kyc={kyc} compact /></div>}
                            <OwnerSummary
                                cartItems={cartItems}
                                formatCurrency={formatCurrency}
                                handleProceedToPayment={handleProceedToPayment}
                                isInitiatingPayment={isInitiatingPayment}
                                unavailableItems={unavailableItems}
                                removeFromCart={removeFromCart}
                                warrantyIds={warrantyIds}
                            />
                            </>
                        )}

                        {/* STEP 4: PAYMENT */}
                        {currentStep === 4 && (
                            <Payment
                                onInitiatePayment={handleInitiatePayment}
                                isInitiatingPayment={isInitiatingPayment}
                            />
                        )}
                    </div>

                    {/* RIGHT COLUMN: Permanent Sidebar Summary */}
                    <SidebarSummary
                        cartItems={cartItems}
                        totals={totals}
                        totalRequestAmount={totalRequestAmount}
                        walletBalance={walletBalance}
                        applicableWalletAmount={applicableWalletAmount}
                        finalPayable={finalPayable}
                        isWalletLoading={isWalletLoading}
                        formatCurrency={formatCurrency}
                    />
                </div>
            </div>
        </div>
    );
}