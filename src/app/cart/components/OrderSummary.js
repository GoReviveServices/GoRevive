import { useRouter } from 'next/navigation';
import React from 'react';
import { MIN_ORDER_UNITS } from '@/lib/pricing';
import { useCart } from '@/components/utils/Context/CartContext';

export default function OrderSummary({ formatCurrency }) {
  const router = useRouter();
  const { cartTotals: totals } = useCart(); // includes any extended warranties
  const isCheckoutDisabled = totals.units < MIN_ORDER_UNITS;

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm sticky top-24">
        <h2 className="text-lg font-bold text-[#0B2136] mb-6">Order Summary</h2>
        
        <div className="space-y-4 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Total Units</span>
            <span className="font-bold text-[#0B2136]">{totals.units}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Subtotal</span>
            <span className="font-bold text-[#0B2136]">{formatCurrency(totals.subtotal)}</span>
          </div>
          
          {totals.warranty > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Extended Warranty ({totals.warrantyUnits})</span>
              <span className="font-bold text-[#0B2136]">+ {formatCurrency(totals.warranty)}</span>
            </div>
          )}

          {totals.discount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span className="font-bold">Bulk Discount (3%)</span>
              <span className="font-bold">- {formatCurrency(totals.discount)}</span>
            </div>
          )}
        </div>
        
        <div className="border-t border-gray-100 pt-4 mb-8">
          <div className="flex justify-between items-end">
            <span className="text-gray-900 font-bold">Total Request</span>
            <span className="text-2xl font-black text-[#0B2136]">
              {formatCurrency(totals.total)}
            </span>
          </div>
        </div>
        
        <button 
          onClick={() => { router.push('/checkout') }} 
          disabled={isCheckoutDisabled} 
          className="w-full bg-[#0B2136] text-white cursor-pointer font-bold py-4 rounded-xl transition-all shadow-md hover:bg-[#1B5E3B] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isCheckoutDisabled ? `Minimum ${MIN_ORDER_UNITS} Items Required` : "Proceed to Checkout"}
        </button>
      </div>
    </div>
  );
}