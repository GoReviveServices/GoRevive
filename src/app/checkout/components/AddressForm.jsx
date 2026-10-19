import React, { useState } from 'react'

const EMPTY = { contact_name: '', contact_no: '', alternate_no: '', locality: '', landmark: '', city: '', state: '', pincode: '', addrs_type: 'Office' }
const TYPES = ['Office', 'Home', 'Other']
const input = 'block w-full rounded-[10px] border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#1B5E3B] focus:ring-2 focus:ring-[#1B5E3B]/20'

function Field({ label, children, className = '' }) {
    return (
        <label className={`block ${className}`}>
            <span className="mb-1 block text-xs font-bold text-gray-600">{label}</span>
            {children}
        </label>
    )
}

// onSubmit(values) resolves true when the address was saved.
export default function AddressForm({ defaultName = '', defaultMobile = '', onSubmit, onCancel, canCancel = true }) {
    const [v, setV] = useState({ ...EMPTY, contact_name: defaultName, contact_no: defaultMobile })
    const [saving, setSaving] = useState(false)
    const set = (k) => (e) => setV((p) => ({ ...p, [k]: e.target.value }))
    const digits = (k, n) => (e) => setV((p) => ({ ...p, [k]: e.target.value.replace(/\D/g, '').slice(0, n) }))

    const submit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try { await onSubmit(v) } finally { setSaving(false) }
    }

    return (
        <form onSubmit={submit} className="rounded-xl border-2 border-[#1B5E3B]/30 bg-emerald-50/20 p-4">
            <h3 className="mb-4 text-base font-bold text-[#0B2136]">Add a new address</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Contact name *"><input required maxLength={80} value={v.contact_name} onChange={set('contact_name')} className={input} autoComplete="name" /></Field>
                <Field label="Mobile number *"><input required inputMode="numeric" pattern="[6-9][0-9]{9}" title="10-digit mobile number" value={v.contact_no} onChange={digits('contact_no', 10)} className={input} autoComplete="tel-national" /></Field>
                <Field label="Address (building, street, area) *" className="sm:col-span-2"><input required maxLength={150} value={v.locality} onChange={set('locality')} className={input} autoComplete="street-address" /></Field>
                <Field label="Landmark (optional)"><input maxLength={100} value={v.landmark} onChange={set('landmark')} className={input} /></Field>
                <Field label="Alternate number (optional)"><input inputMode="numeric" pattern="[6-9][0-9]{9}" title="10-digit mobile number" value={v.alternate_no} onChange={digits('alternate_no', 10)} className={input} /></Field>
                <Field label="City *"><input required maxLength={60} value={v.city} onChange={set('city')} className={input} autoComplete="address-level2" /></Field>
                <Field label="State *"><input required maxLength={60} value={v.state} onChange={set('state')} className={input} autoComplete="address-level1" /></Field>
                <Field label="Pincode *"><input required inputMode="numeric" pattern="[1-9][0-9]{5}" title="6-digit pincode" value={v.pincode} onChange={digits('pincode', 6)} className={input} autoComplete="postal-code" /></Field>
                <div>
                    <span className="mb-1 block text-xs font-bold text-gray-600">Address type</span>
                    <div className="flex gap-2">
                        {TYPES.map((t) => (
                            <button key={t} type="button" onClick={() => setV((p) => ({ ...p, addrs_type: t }))} aria-pressed={v.addrs_type === t}
                                className={`rounded-[10px] border px-4 py-2 text-sm font-semibold ${v.addrs_type === t ? 'border-[#1B5E3B] bg-[#F0FAF5] text-[#1B5E3B]' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="mt-5 flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 rounded-[12px] bg-[#0B2136] py-3 text-sm font-bold text-white transition-colors hover:bg-[#1B5E3B] disabled:opacity-60">{saving ? 'Saving…' : 'Save address'}</button>
                {canCancel && <button type="button" onClick={onCancel} disabled={saving} className="rounded-[12px] border border-gray-300 px-5 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>}
            </div>
        </form>
    )
}
